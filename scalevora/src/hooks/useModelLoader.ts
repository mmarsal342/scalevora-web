import { useAppStore } from '@/store/appStore'
import { detectBackend } from '@/utils/compatUtils'
import type { ScaleFactor } from '@/types'

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

const upscalerCache = new Map<ScaleFactor, UpscalerInstance>()

async function loadModelForScale(scale: ScaleFactor): Promise<UpscalerInstance> {
  const cached = upscalerCache.get(scale)
  if (cached) return cached

  const [{ default: Upscaler }, modelMod] = await Promise.all([
    import('upscaler'),
    scale === 2
      ? import('@upscalerjs/esrgan-slim/2x')
      : import('@upscalerjs/esrgan-slim/4x'),
  ])

  // model export shape: default
  const model = (modelMod as { default: unknown }).default

  const instance = new (Upscaler as unknown as new (
    opts: { model: unknown },
  ) => UpscalerInstance)({ model })

  upscalerCache.set(scale, instance)
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

export function useModelLoader() {
  const setModelStatus = useAppStore((s) => s.setModelStatus)
  const setModelProgress = useAppStore((s) => s.setModelProgress)
  const setBackend = useAppStore((s) => s.setBackend)
  const modelStatus = useAppStore((s) => s.modelStatus)
  const backend = useAppStore((s) => s.backend)

  async function ensureModelReady(scale: ScaleFactor): Promise<UpscalerInstance> {
    if (!backend) {
      setBackend(await detectBackend())
    }

    if (upscalerCache.has(scale) && modelStatus === 'ready') {
      return upscalerCache.get(scale)!
    }

    setModelStatus('loading')
    setModelProgress(0)

    try {
      // Coarse progress: dynamic import resolved = 100%. There's no granular
      // download progress event from the bundler — finer progress would
      // require manually fetching the JSON weight file and tracking response
      // body chunks. Not worth the complexity at this stage.
      const instance = await loadModelForScale(scale)
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
