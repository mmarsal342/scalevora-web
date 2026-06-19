import { useRef } from 'react'
import { useBatchStore, triggerDownload, buildBatchFilename } from '@/store/batchStore'
import { loadModelForBatch, disposeBatchModel } from '@/hooks/useModelLoader'
import { normalizedImageBitmap } from '@/utils/exifUtils'
import { convertHeicToPng } from '@/utils/heicUtils'
import { getDimensions, computeOutputDimensions, checkOutputSize } from '@/utils/imageUtils'
import type { BatchItem } from '@/types'

const PATCH_SIZE = 128

// Re-encode canvas → blob with correct mime type
async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      mimeType,
      quality,
    )
  })
}

export function useBatchUpscaler() {
  const abortRef = useRef<AbortController | null>(null)
  const {
    scaleFactor,
    artStyle,
    autoDownload,
    updateItem,
    setRunning,
    setActiveId,
  } = useBatchStore()

  async function processItem(item: BatchItem): Promise<void> {
    const abortCtrl = abortRef.current
    if (!abortCtrl || abortCtrl.signal.aborted) return

    updateItem(item.id, { status: 'processing', progress: 0, error: null })

    try {
      // 1. HEIC → PNG convert if needed
      const decodableBlob: Blob =
        item.format === 'heic' ? await convertHeicToPng(item.file) : item.file

      if (abortCtrl.signal.aborted) return

      // 2. EXIF normalize
      const bitmap = await normalizedImageBitmap(decodableBlob)
      const dimensions = getDimensions(bitmap)
      updateItem(item.id, { dimensions })

      // Bail out early if the output would exceed GPU/tensor size limits
      const sizeError = checkOutputSize(dimensions, useBatchStore.getState().scaleFactor)
      if (sizeError) {
        bitmap.close()
        throw new Error(sizeError)
      }

      // Draw to canvas (UpscalerJS expects HTMLCanvasElement)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
      bitmap.close()

      if (abortCtrl.signal.aborted) return

      // 3. Load model (fresh each time — dispose between items prevents OOM)
      const upscaler = await loadModelForBatch(scaleFactor, artStyle)

      if (abortCtrl.signal.aborted) return

      // 4. Upscale
      const resultBase64 = await upscaler.execute(canvas, {
        patchSize: PATCH_SIZE,
        padding: 2,
        awaitNextFrame: true,
        signal: abortCtrl.signal,
        progress: (amount: number) => {
          updateItem(item.id, { progress: Math.round(amount * 100) })
        },
      })

      if (abortCtrl.signal.aborted) return

      // 5. Re-encode output blob
      const mimeType = item.format === 'png' || item.format === 'heic' ? 'image/png' : 'image/jpeg'
      const quality = mimeType === 'image/jpeg' ? 0.95 : undefined

      // Decode base64 result into a canvas then convert
      const img = new Image()
      img.src = resultBase64
      await img.decode()
      const outCanvas = document.createElement('canvas')
      outCanvas.width = img.naturalWidth
      outCanvas.height = img.naturalHeight
      outCanvas.getContext('2d')!.drawImage(img, 0, 0)
      const resultBlob = await canvasToBlob(outCanvas, mimeType, quality)

      const resultDimensions = computeOutputDimensions(dimensions, scaleFactor)
      updateItem(item.id, { progress: 100, resultBlob, resultDimensions })

      // 6. Auto-download if enabled
      if (autoDownload) {
        const filename = buildBatchFilename(item.file.name, scaleFactor, item.format)
        triggerDownload(resultBlob, filename)
        // Free blob from memory after download trigger
        updateItem(item.id, { status: 'saved', resultBlob: null })
      } else {
        updateItem(item.id, { status: 'done' })
      }
    } catch (e) {
      if (abortCtrl.signal.aborted) return
      const msg = e instanceof Error ? e.message : 'Upscale failed.'
      updateItem(item.id, { status: 'error', error: msg })
    } finally {
      // 7. ALWAYS dispose model to free GPU memory before next item
      await disposeBatchModel()
    }
  }

  async function startBatch() {
    if (useBatchStore.getState().isRunning) return

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setRunning(true)

    try {
      // Process queued items in order — sequential, never parallel
      const allItems = useBatchStore.getState().items
      for (const item of allItems) {
        if (ctrl.signal.aborted) break
        if (item.status !== 'queued') continue

        setActiveId(item.id)
        await processItem(item)
      }
    } finally {
      setActiveId(null)
      setRunning(false)
      abortRef.current = null
    }
  }

  function cancelBatch() {
    abortRef.current?.abort()
    // Mark any still-queued items back visually (they stay queued, not started)
    const state = useBatchStore.getState()
    state.items.forEach((item) => {
      if (item.status === 'processing') {
        useBatchStore.getState().updateItem(item.id, { status: 'queued', progress: 0 })
      }
    })
  }

  return { startBatch, cancelBatch }
}
