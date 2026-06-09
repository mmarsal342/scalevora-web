export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ProcessingStatus =
  | 'idle'
  | 'processing'
  | 'cancelling'
  | 'done'
  | 'error'
export type Backend = 'webgpu' | 'webgl' | 'wasm' | null
export type CompatLevel = 'full' | 'limited' | 'unsupported'
export type ImageFormat = 'jpg' | 'png' | 'heic'
export type ScaleFactor = 2 | 4
export type Locale = 'en' | 'id'

export interface Dimensions {
  width: number
  height: number
}
