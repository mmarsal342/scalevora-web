import type { Backend } from '@/types'

export async function detectBackend(): Promise<Backend> {
  if ('gpu' in navigator && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) return 'webgpu'
    } catch {
      // fall through
    }
  }

  const probe = document.createElement('canvas')
  if (probe.getContext('webgl2') || probe.getContext('webgl')) {
    return 'webgl'
  }

  return 'wasm'
}

export function backendLabel(backend: Backend): string {
  switch (backend) {
    case 'webgpu':
      return '⚡ WebGPU'
    case 'webgl':
      return '● WebGL'
    case 'wasm':
      return '○ WASM'
    case null:
      return ''
  }
}
