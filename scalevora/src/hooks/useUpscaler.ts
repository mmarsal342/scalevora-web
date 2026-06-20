import { useAppStore } from '@/store/appStore'
import { useModelLoader, disposeModelCache } from './useModelLoader'
import { normalizedImageBitmap } from '@/utils/exifUtils'
import {
  computeOutputDimensions,
  getLongestSide,
  outputFormatFor,
  pickPatchSize,
} from '@/utils/imageUtils'

async function base64ToBlob(
  base64DataUrl: string,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  // Round-trip through canvas to re-encode with our chosen mime/quality.
  // Upscaler returns base64 PNG by default; for JPG output we need to recompress.
  const img = new Image()
  img.src = base64DataUrl
  await img.decode()

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      mimeType,
      quality,
    )
  })
}

export function useUpscaler() {
  const { ensureModelReady } = useModelLoader()

  const setProcessingStatus = useAppStore((s) => s.setProcessingStatus)
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress)
  const setResult = useAppStore((s) => s.setResult)
  const setAbortController = useAppStore((s) => s.setAbortController)

  async function runUpscale(): Promise<void> {
    const state = useAppStore.getState()
    const { originalFile, originalFormat, croppedBlob, scaleFactor, artStyle } = state

    if (!originalFile || !originalFormat) {
      throw new Error('No image to upscale.')
    }

    const sourceBlob: Blob = croppedBlob ?? originalFile

    setProcessingStatus('processing')
    setProcessingProgress(0)

    const abortController = new AbortController()
    setAbortController(abortController)

    try {
      const upscaler = await ensureModelReady(scaleFactor, artStyle)

      // Normalize EXIF orientation before handing to upscaler. We pass an
      // HTMLImageElement because that's what UpscalerJS expects in the browser.
      const bitmap = await normalizedImageBitmap(sourceBlob)
      const inputDims = { width: bitmap.width, height: bitmap.height }

      const normalizedCanvas = document.createElement('canvas')
      normalizedCanvas.width = bitmap.width
      normalizedCanvas.height = bitmap.height
      normalizedCanvas.getContext('2d')!.drawImage(bitmap, 0, 0)
      bitmap.close()

      const patchSize = pickPatchSize(getLongestSide(inputDims))

      const resultBase64 = await upscaler.execute(normalizedCanvas, {
        patchSize,
        padding: 2,
        signal: abortController.signal,
        // Yield to the event loop between tiles. Without this, the progress
        // callback fires hundreds of times in a microtask burst, the main
        // thread never repaints, and React's batched setState count blows
        // past its safety threshold.
        awaitNextFrame: true,
        progress: (amount: number) => {
          setProcessingProgress(Math.round(amount * 100))
        },
      })

      if (abortController.signal.aborted) {
        setProcessingStatus('idle')
        return
      }

      const outputCfg = outputFormatFor(originalFormat)
      const resultBlob = await base64ToBlob(
        resultBase64,
        outputCfg.mimeType,
        outputCfg.quality,
      )

      const outputDims = computeOutputDimensions(inputDims, scaleFactor)
      setResult(resultBlob, outputDims)
    } catch (e) {
      if (abortController.signal.aborted) {
        setProcessingStatus('idle')
        return
      }
      setProcessingStatus('error')
      throw e
    } finally {
      setAbortController(null)
      // Clean up tfjs memory to prevent tensor leaks on subsequent uploads
      await disposeModelCache()
    }
  }

  function cancelUpscale(): void {
    const ctrl = useAppStore.getState().abortController
    if (!ctrl) return
    // UpscalerJS aborts between tiles, not mid-tile — set state to
    // 'cancelling' so the UI is honest about the delay.
    setProcessingStatus('cancelling')
    ctrl.abort()
  }

  return { runUpscale, cancelUpscale }
}
