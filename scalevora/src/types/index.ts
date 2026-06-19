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
export type UpscalerMode = 'single' | 'batch'
export type ArtStyle = 'photo' | 'anime'
export type Locale = 'en' | 'id'

export interface Dimensions {
  width: number
  height: number
}

// Batch types
export type BatchItemStatus = 'queued' | 'processing' | 'done' | 'error' | 'saved'

export interface BatchItem {
  id: string
  file: File
  format: ImageFormat
  status: BatchItemStatus
  progress: number        // 0–100
  dimensions: Dimensions | null
  resultBlob: Blob | null // null after auto-download to free memory
  resultDimensions: Dimensions | null
  error: string | null
}
