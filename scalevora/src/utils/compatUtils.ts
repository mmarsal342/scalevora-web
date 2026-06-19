import * as tf from '@tensorflow/tfjs'
import type { Backend } from '@/types'

/**
 * Detects the best available backend for this device.
 *
 * Order of preference: WebGPU → WebGL (with shader probe) → WASM/CPU
 *
 * The WebGL path now includes a lightweight shader smoke-test: we try to
 * run a tiny matMul on the GPU.  Devices with an older Intel HD / mobile GPU
 * (common on budget ASUS laptops) can create a WebGL context fine, but
 * fail to compile the GLSL shaders required by ESRGAN at inference time.
 * By probing upfront we can route those devices straight to WASM so they
 * never see a cryptic "Failed to link vertex and fragment shaders" error.
 */
export async function detectBackend(): Promise<Backend> {
  // ── 1. WebGPU ──────────────────────────────────────────────────────────
  if ('gpu' in navigator && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) return 'webgpu'
    } catch {
      // fall through
    }
  }

  // ── 2. WebGL — with shader smoke-test ─────────────────────────────────
  const probe = document.createElement('canvas')
  const hasWebGL = probe.getContext('webgl2') || probe.getContext('webgl')

  if (hasWebGL) {
    try {
      // Switch TF.js to webgl and run a tiny operation that exercises the
      // shader compiler.  If the GPU can't compile, this throws / logs a
      // WebGL error which we catch and handle by falling through to WASM.
      await tf.setBackend('webgl')
      await tf.ready()

      // A 4×4 matMul touches the same GLSL path that the upscaler uses.
      const a = tf.ones([4, 4])
      const b = tf.ones([4, 4])
      const result = tf.matMul(a, b)
      // Force synchronous read so any GPU errors surface now.
      await result.data()
      a.dispose(); b.dispose(); result.dispose()

      return 'webgl'
    } catch {
      console.warn('[ScaleVora] WebGL shader test failed — falling back to WASM/CPU.')
      // fall through to WASM
    }
  }

  // ── 3. WASM / CPU fallback ─────────────────────────────────────────────
  return 'wasm'
}

/** Set the TF.js backend to match what detectBackend() returned. */
export async function applyBackend(backend: Backend): Promise<void> {
  if (backend === 'webgpu') {
    try {
      await tf.setBackend('webgpu')
      await tf.ready()
      return
    } catch {
      // WebGPU context lost — drop to webgl
    }
  }

  if (backend === 'webgl') {
    try {
      await tf.setBackend('webgl')
      await tf.ready()
      return
    } catch {
      // fall through
    }
  }

  // WASM — import the WASM backend on demand so it doesn't bloat the initial bundle
  await import('@tensorflow/tfjs-backend-cpu')
  await tf.setBackend('cpu')
  await tf.ready()
}

export function backendLabel(backend: Backend): string {
  switch (backend) {
    case 'webgpu':
      return '⚡ WebGPU'
    case 'webgl':
      return '● WebGL'
    case 'wasm':
      return '○ CPU Mode'
    case null:
      return ''
  }
}

/** True when the active backend is CPU (WASM). Used to show a perf warning. */
export function isCpuMode(backend: Backend): boolean {
  return backend === 'wasm'
}
