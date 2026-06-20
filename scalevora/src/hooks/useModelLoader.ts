import { useAppStore } from '@/store/appStore'
import { detectBackend, applyBackend } from '@/utils/compatUtils'
import * as tf from '@tensorflow/tfjs'
import type { ScaleFactor, ArtStyle, PhotoQuality } from '@/types'

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

async function loadModelForScale(
  scale: ScaleFactor,
  style: ArtStyle,
  quality: PhotoQuality,
): Promise<UpscalerInstance> {
  const cacheKey = `${scale}-${style}-${quality}`
  const cached = upscalerCache.get(cacheKey)
  if (cached) return cached

  const [{ default: Upscaler }, tf] = await Promise.all([
    import('upscaler'),
    import('@tensorflow/tfjs'),
  ])

  let instance: UpscalerInstance
  if (style === 'anime') {
    // Custom Real-CUGAN graph model.
    //
    // FIX: Real-CUGAN expects FLOAT32 input in [0, 1] range.
    // UpscalerJS passes raw INT32 pixels [0, 255] by default for graph models,
    // causing "DTYPE MUST BE FLOAT32 BUT WAS INT32" errors.
    // We provide explicit preprocess/postprocess to handle the conversion.
    //
    // If the GPU doesn't support the shader (e.g. old Intel/mobile GPUs that
    // fail with "Failed to link vertex and fragment shaders"), we catch it and
    // fall back to the ESRGAN-Slim photo model transparently.
    try {
      instance = new (Upscaler as unknown as new (
        opts: { model: unknown },
      ) => UpscalerInstance)({
        model: {
          path: `/models/anime/${scale}x/model.json`,
          scale: scale,
          modelType: 'graph',
          // Normalize INT32 [0,255] → FLOAT32 [0,1]
          preprocess: (t: ReturnType<typeof tf.tensor>) => {
            const float = tf.cast(t, 'float32')
            const normalized = tf.div(float, 255.0)
            float.dispose()
            return normalized as ReturnType<typeof tf.tensor>
          },
          // Scale FLOAT32 [0,1] → FLOAT32 [0,255] for UpscalerJS output
          postprocess: (t: ReturnType<typeof tf.tensor>) => {
            const clipped = tf.clipByValue(t, 0, 1)
            const scaled = tf.mul(clipped, 255.0)
            clipped.dispose()
            return scaled as ReturnType<typeof tf.tensor>
          },
        },
      })
    } catch (e) {
      // Shader compilation failed (unsupported GPU). Fall back to photo model.
      console.warn('[ScaleVora] Anime model failed to load, falling back to photo model:', e)
      const modelMod = scale === 2
        ? await import('@upscalerjs/esrgan-slim/2x')
        : await import('@upscalerjs/esrgan-slim/4x')
      const model = (modelMod as { default: unknown }).default
      instance = new (Upscaler as unknown as new (
        opts: { model: unknown },
      ) => UpscalerInstance)({ model })
    }
  } else if (quality === 'quality') {
    // ESRGAN-Medium for high quality photos
    const modelMod = scale === 2
      ? await import('@upscalerjs/esrgan-medium/2x')
      : await import('@upscalerjs/esrgan-medium/4x')
    const model = (modelMod as { default: unknown }).default
    instance = new (Upscaler as unknown as new (
      opts: { model: unknown },
    ) => UpscalerInstance)({ model })
  } else {
    // Default ESRGAN-Slim for fast photos
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
export async function loadModelForBatch(
  scale: ScaleFactor,
  style: ArtStyle,
  quality: PhotoQuality,
): Promise<UpscalerInstance> {
  const backend = await detectBackend()
  await applyBackend(backend)

  // Use a completely un-cached instance for batch to avoid memory pollution
  // We bypass loadModelForScale and create it directly.
  const [{ default: Upscaler }] = await Promise.all([
    import('upscaler'),
  ])

  let instance: UpscalerInstance
  if (style === 'anime') {
    instance = new (Upscaler as unknown as new (
      opts: { model: unknown },
    ) => UpscalerInstance)({
      model: {
        path: `/models/anime/${scale}x/model.json`,
        scale: scale,
        modelType: 'graph',
        preprocess: (t: ReturnType<typeof tf.tensor>) => {
          const float = tf.cast(t, 'float32')
          const normalized = tf.div(float, 255.0)
          float.dispose()
          return normalized as ReturnType<typeof tf.tensor>
        },
        postprocess: (t: ReturnType<typeof tf.tensor>) => {
          const clipped = tf.clipByValue(t, 0, 1)
          const scaled = tf.mul(clipped, 255.0)
          clipped.dispose()
          return scaled as ReturnType<typeof tf.tensor>
        },
      },
    })
  } else if (quality === 'quality') {
    const modelMod = scale === 2
      ? await import('@upscalerjs/esrgan-medium/2x')
      : await import('@upscalerjs/esrgan-medium/4x')
    const model = (modelMod as { default: unknown }).default
    instance = new (Upscaler as unknown as new (
      opts: { model: unknown },
    ) => UpscalerInstance)({ model })
  } else {
    const modelMod = scale === 2
      ? await import('@upscalerjs/esrgan-slim/2x')
      : await import('@upscalerjs/esrgan-slim/4x')
    const model = (modelMod as { default: unknown }).default
    instance = new (Upscaler as unknown as new (
      opts: { model: unknown },
    ) => UpscalerInstance)({ model })
  }
  return instance
}

/** Dispose all cached instances or a specific batch instance — frees GPU memory. */
export async function disposeBatchModel(instanceToDispose?: UpscalerInstance) {
  if (instanceToDispose?.dispose) {
    try {
      await instanceToDispose.dispose()
    } catch (e) {
      console.error('[batch] Failed to dispose specific upscaler', e)
    }
  }

  for (const instance of upscalerCache.values()) {
    try {
      if (instance.dispose) await instance.dispose()
    } catch (e) {
      console.error('[batch] Failed to dispose cached upscaler', e)
    }
  }
  upscalerCache.clear()

  // Clean up any TF.js variables still tracked (model weights, embeddings, etc.)
  try {
    tf.disposeVariables()
  } catch (e) {
    console.warn('[batch] disposeVariables failed:', e)
  }

  // Yield to the event loop so the browser can actually GC the released memory
  // before the next batch item starts loading its model.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

export function useModelLoader() {
  const setModelStatus = useAppStore((s) => s.setModelStatus)

  async function ensureModelReady(
    scale: ScaleFactor,
    style: ArtStyle,
    quality: PhotoQuality,
  ): Promise<UpscalerInstance> {
    if (useAppStore.getState().modelStatus !== 'ready') {
      useAppStore.getState().setModelStatus('loading')
      useAppStore.getState().setModelProgress(0)
    }

    try {
      // Initialize backend if not done yet
      if (!useAppStore.getState().backend) {
        const detected = await detectBackend()
        useAppStore.getState().setBackend(detected)
        await applyBackend(detected)
      }

      const upscaler = await loadModelForScale(scale, style, quality)
      useAppStore.getState().setModelStatus('ready')
      return upscaler
    } catch (e) {
      setModelStatus('error')
      throw e
    }
  }

  return { ensureModelReady }
}
