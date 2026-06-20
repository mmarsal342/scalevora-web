import { useRef } from 'react'
import { useBatchStore, triggerDownload, buildBatchFilename } from '@/store/batchStore'
import { loadModelForBatch, disposeBatchModel } from '@/hooks/useModelLoader'
import { normalizedImageBitmap } from '@/utils/exifUtils'
import { convertHeicToPng } from '@/utils/heicUtils'
import {
  getDimensions,
  getLongestSide,
  computeOutputDimensions,
  pickPatchSize,
  applyUnsharpMask,
} from '@/utils/imageUtils'
import type { BatchItem } from '@/types'
import * as tf from '@tensorflow/tfjs'
import { normalizeError } from '@/utils/errorUtils'

// ── helpers ───────────────────────────────────────────────────────────────────

async function base64ToCanvas(base64DataUrl: string): Promise<HTMLCanvasElement> {
  const img = new Image()
  img.src = base64DataUrl
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d')!.drawImage(img, 0, 0)
  return canvas
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  // Apply post-processing sharpening before encoding
  applyUnsharpMask(canvas)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      mimeType,
      quality,
    )
  })
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useBatchUpscaler() {
  const abortRef = useRef<AbortController | null>(null)
  const {
    scaleFactor,
    artStyle,
    photoQuality,
    autoDownload,
    updateItem,
    setRunning,
    setActiveId,
  } = useBatchStore()

  async function processItem(item: BatchItem): Promise<void> {
    const abortCtrl = abortRef.current
    if (!abortCtrl || abortCtrl.signal.aborted) return

    updateItem(item.id, { status: 'processing', progress: 0, error: null, elapsedMs: null })
    const startedAt = performance.now()
    let upscaler: any = null

    try {
      // 1. HEIC → PNG convert if needed
      const decodableBlob: Blob =
        item.format === 'heic' ? await convertHeicToPng(item.file) : item.file

      if (abortCtrl.signal.aborted) return

      // 2. EXIF normalize
      const bitmap = await normalizedImageBitmap(decodableBlob)
      const dimensions = getDimensions(bitmap)
      updateItem(item.id, { dimensions })

      let workingCanvas = document.createElement('canvas')
      workingCanvas.width = bitmap.width
      workingCanvas.height = bitmap.height
      workingCanvas.getContext('2d')!.drawImage(bitmap, 0, 0)
      bitmap.close()

      const patchSize = pickPatchSize(getLongestSide(dimensions))

      if (abortCtrl.signal.aborted) return

      // 3. Load 2× model — used for both single-pass (2×) and multi-pass (4×)
      const useMultiPass = scaleFactor === 4
      const modelScale = useMultiPass ? 2 : scaleFactor
      
      let resultBase64: string
      tf.engine().startScope()
      try {
        upscaler = await loadModelForBatch(modelScale, artStyle, photoQuality)
        if (abortCtrl.signal.aborted) return

        // ── Pass 1 ────────────────────────────────────────────────────────
        const pass1Base64 = await upscaler.execute(workingCanvas, {
          patchSize,
          padding: 2,
          awaitNextFrame: true,
          signal: abortCtrl.signal,
          progress: (amount: number) => {
            updateItem(item.id, {
              progress: useMultiPass
                ? Math.round(amount * 48)   // 0–48% for pass 1 of 4×
                : Math.round(amount * 95),  // 0–95% for single-pass 2×
            })
          },
        })

        if (abortCtrl.signal.aborted) return

        if (useMultiPass) {
          // ── Pass 2 (4× multi-pass only) ──────────────────────────────
          updateItem(item.id, { progress: 48 })
          workingCanvas = await base64ToCanvas(pass1Base64)

          resultBase64 = await upscaler.execute(workingCanvas, {
            patchSize,
            padding: 2,
            awaitNextFrame: true,
            signal: abortCtrl.signal,
            progress: (amount: number) => {
              updateItem(item.id, { progress: 48 + Math.round(amount * 47) }) // 48–95%
            },
          })
        } else {
          resultBase64 = pass1Base64
        }
      } finally {
        // endScope cleans up ALL intermediate tensors from both passes at once.
        // Model weights (Variables) are unaffected.
        tf.engine().endScope()
      }

      if (abortCtrl.signal.aborted) return

      // 5. Apply sharpening + encode output blob
      const mimeType = item.format === 'png' || item.format === 'heic' ? 'image/png' : 'image/jpeg'
      const quality  = mimeType === 'image/jpeg' ? 0.95 : undefined

      const outCanvas = await base64ToCanvas(resultBase64)
      const resultBlob = await canvasToBlob(outCanvas, mimeType, quality)

      const resultDimensions = computeOutputDimensions(dimensions, scaleFactor)
      const elapsedMs = performance.now() - startedAt
      updateItem(item.id, { progress: 100, resultBlob, resultDimensions, elapsedMs })

      // 6. Auto-download if enabled
      if (autoDownload) {
        const filename = buildBatchFilename(item.file.name, scaleFactor, item.format)
        triggerDownload(resultBlob, filename)
        updateItem(item.id, { status: 'saved', resultBlob: null })
      } else {
        updateItem(item.id, { status: 'done' })
      }
    } catch (e) {
      if (abortCtrl.signal.aborted) return
      updateItem(item.id, { status: 'error', error: normalizeError(e) })
    } finally {
      // ALWAYS dispose model + flush GPU memory before next item
      await disposeBatchModel(upscaler)
    }
  }

  async function startBatch() {
    if (useBatchStore.getState().isRunning) return

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setRunning(true)

    try {
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
    const state = useBatchStore.getState()
    state.items.forEach((item) => {
      if (item.status === 'processing') {
        useBatchStore.getState().updateItem(item.id, { status: 'queued', progress: 0 })
      }
    })
  }

  return { startBatch, cancelBatch }
}
