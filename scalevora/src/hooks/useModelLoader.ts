import { useAppStore } from '@/store/appStore'
import { detectBackend } from '@/utils/compatUtils'
import type { ScaleFactor, ArtStyle } from '@/types'

// Module-scope cache so a second upload doesn't re-instantiate the upscaler
// (cheap in dev, but tfjs eats memory if you keep re-creating).
type UpscalerInstance = {
  execute: (image: HTMLImageElement | string | HTMLCanvasElement, opts: {
    patchSize?: number
    padding?: number
    progress?: (amount: number) => void
    signal?: AbortSignal
    awaitNextFrame?: boolean
    output?: 'base64' | 'tensor'
  }) => Promise<string>
  abort: () => void
  dispose: () => Promise<void>
}

const upscalerCache = new Map<string, UpscalerInstance>()

async function loadModelForScale(scale: ScaleFactor, style: ArtStyle): Promise<UpscalerInstance> {
  const cacheKey = `${scale}-${style}`
  const cached = upscalerCache.get(cacheKey)
  if (cached) return cached

  const { default: Upscaler } = await import('upscaler')

  let instance: UpscalerInstance
  if (style === 'anime') {
    // Custom Real-CUGAN model hosted locally
    instance = new (Upscaler as unknown as new (
      opts: { model: unknown },
    ) => UpscalerInstance)({
      model: {
        path: `/models/anime/${scale}x/model.json`,
        scale: scale,
        modelType: 'graph',
      },
    })
  } else {
    // Default ESRGAN-Slim for photos
    const modelMod = scale === 2
      ? await import('@upscalerjs/esrgan-slim/2x')
      : await import('@upscalerjs/esrgan-slim/4x')
    const model = (modelMod as { default: unknown }).default
    instance = new (Upscaler as unknown as new (
      opts: { model: unknown },
    ) => UpscalerInstance)({ model })
  }

  upscalerCache.set(cacheKey, instance)
  return instance
}

/**
 * Lazy-on-intent loader. Call ensureModelReady() before kicking off an upscale.
 * Page load stays instant; the user pays the model download cost when they
 * actually want to upscale.
 */
export async function disposeModelCache() {
  for (const instance of upscalerCache.values()) {
    try {
      if (instance.dispose) await instance.dispose()
    } catch (e) {
      console.error('Failed to dispose upscaler', e)
    }
  }
  upscalerCache.clear()
  useAppStore.getState().setModelStatus('idle')
}

/**
 * Batch-mode model loader — does NOT touch appStore (no model status badge).
 * Each batch item calls this fresh, so the model is re-loaded each time.
 * That's intentional: we dispose between items to prevent OOM.
 */
export async function loadModelForBatch(scale: ScaleFactor, style: ArtStyle): Promise<UpscalerInstance> {
  return loadModelForScale(scale, style)
}

/** Dispose all cached instances after a batch item — frees GPU memory. */
export async function disposeBatchModel() {
  for (const instance of upscalerCache.values()) {
    try {
      if (instance.dispose) await instance.dispose()
    } catch (e) {
      console.error('[batch] Failed to dispose upscaler', e)
    }
  }
  upscalerCache.clear()
}

export function useModelLoader() {
  const setModelStatus = useAppStore((s) => s.setModelStatus)
  const setModelProgress = useAppStore((s) => s.setModelProgress)
  const setBackend = useAppStore((s) => s.setBackend)
  const modelStatus = useAppStore((s) => s.modelStatus)
  const backend = useAppStore((s) => s.backend)

  async function ensureModelReady(scale: ScaleFactor, style: ArtStyle): Promise<UpscalerInstance> {
    if (!backend) {
      setBackend(await detectBackend())
    }

    const cacheKey = `${scale}-${style}`
    if (upscalerCache.has(cacheKey) && modelStatus === 'ready') {
      return upscalerCache.get(cacheKey)!
    }

    setModelStatus('loading')
    setModelProgress(0)

    try {
      const instance = await loadModelForScale(scale, style)
      setModelProgress(100)
      setModelStatus('ready')
      return instance
    } catch (e) {
      setModelStatus('error')
      throw e
    }
  }

  return { ensureModelReady }
}
