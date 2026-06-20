import { useAppStore } from '@/store/appStore'
import { useModelLoader, disposeModelCache } from './useModelLoader'
import { normalizedImageBitmap } from '@/utils/exifUtils'
import {
  computeOutputDimensions,
  getLongestSide,
  outputFormatFor,
  pickPatchSize,
  applyUnsharpMask,
} from '@/utils/imageUtils'
import { normalizeError } from '@/utils/errorUtils'

// ---------- helpers -----------------------------------------------------------

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

// ---------- hook --------------------------------------------------------------

export function useUpscaler() {
  const { ensureModelReady } = useModelLoader()

  const setProcessingStatus = useAppStore((s) => s.setProcessingStatus)
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress)
  const setProcessingElapsed = useAppStore((s) => s.setProcessingElapsed)
  const setProcessingError = useAppStore((s) => s.setProcessingError)
  const setResult = useAppStore((s) => s.setResult)
  const setAbortController = useAppStore((s) => s.setAbortController)

  async function runUpscale(): Promise<void> {
    const state = useAppStore.getState()
    const { originalFile, originalFormat, croppedBlob, scaleFactor, artStyle, photoQuality } = state

    if (!originalFile || !originalFormat) {
      throw new Error('No image to upscale.')
    }

    const sourceBlob: Blob = croppedBlob ?? originalFile

    setProcessingStatus('processing')
    setProcessingProgress(0)
    setProcessingError(null)
    setProcessingElapsed(null)

    const abortController = new AbortController()
    setAbortController(abortController)

    try {
      // For 4× we always run 2× model twice (multi-pass).
      // Quality is noticeably better because each pass has richer per-pixel context.
      const useMultiPass = scaleFactor === 4
      const modelScale = useMultiPass ? 2 : scaleFactor

      const upscaler = await ensureModelReady(modelScale, artStyle, photoQuality)

      const startedAt = performance.now()

      // Normalize EXIF orientation
      const bitmap = await normalizedImageBitmap(sourceBlob)
      const inputDims = { width: bitmap.width, height: bitmap.height }

      let workingCanvas = document.createElement('canvas')
      workingCanvas.width = bitmap.width
      workingCanvas.height = bitmap.height
      workingCanvas.getContext('2d')!.drawImage(bitmap, 0, 0)
      bitmap.close()

      const patchSize = pickPatchSize(getLongestSide(inputDims))

      // ── Pass 1 (or only pass for 2×) ────────────────────────────────────
      const pass1Base64 = await upscaler.execute(workingCanvas, {
        patchSize,
        padding: 2,
        signal: abortController.signal,
        awaitNextFrame: true,
        progress: (amount: number) => {
          // First pass covers 0–50% for multi-pass, 0–95% for single-pass
          // (reserve last 5% for sharpening render)
          setProcessingProgress(useMultiPass
            ? Math.round(amount * 48)
            : Math.round(amount * 95))
        },
      })

      if (abortController.signal.aborted) { setProcessingStatus('idle'); return }

      if (!useMultiPass) {
        // Single pass done — apply sharpening + encode
        const outputCfg = outputFormatFor(originalFormat)
        const resultCanvas = await base64ToCanvas(pass1Base64)
        setProcessingProgress(98)
        const resultBlob = await canvasToBlob(resultCanvas, outputCfg.mimeType, outputCfg.quality)
        const outputDims = computeOutputDimensions(inputDims, scaleFactor)
        setProcessingProgress(100)
        
        const elapsed = performance.now() - startedAt
        setProcessingElapsed(elapsed)
        setResult(resultBlob, outputDims)
        return
      }

      // ── Pass 2 (multi-pass 4× only) ────────────────────────────────────
      setProcessingProgress(48)
      workingCanvas = await base64ToCanvas(pass1Base64)

      const pass2Base64 = await upscaler.execute(workingCanvas, {
        patchSize,
        padding: 2,
        signal: abortController.signal,
        awaitNextFrame: true,
        progress: (amount: number) => {
          setProcessingProgress(48 + Math.round(amount * 47)) // 48–95%
        },
      })

      if (abortController.signal.aborted) { setProcessingStatus('idle'); return }

      // Apply sharpening + encode
      const outputCfg = outputFormatFor(originalFormat)
      const resultCanvas = await base64ToCanvas(pass2Base64)
      setProcessingProgress(98)
      const resultBlob = await canvasToBlob(resultCanvas, outputCfg.mimeType, outputCfg.quality)
      const outputDims = computeOutputDimensions(inputDims, scaleFactor)
      setProcessingProgress(100)
      
      const elapsed = performance.now() - startedAt
      setProcessingElapsed(elapsed)
      setResult(resultBlob, outputDims)

    } catch (e) {
      if (abortController.signal.aborted) {
        setProcessingStatus('idle')
        return
      }
      const humanMsg = normalizeError(e)
      setProcessingError(humanMsg)
      setProcessingStatus('error')
      throw new Error(humanMsg)
    } finally {
      setAbortController(null)
      await disposeModelCache()
    }
  }

  function cancelUpscale(): void {
    const ctrl = useAppStore.getState().abortController
    if (!ctrl) return
    setProcessingStatus('cancelling')
    ctrl.abort()
  }

  return { runUpscale, cancelUpscale }
}
