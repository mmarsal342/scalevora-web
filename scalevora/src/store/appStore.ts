import { create } from 'zustand'
import type {
  ModelStatus,
  ProcessingStatus,
  Backend,
  CompatLevel,
  ImageFormat,
  ScaleFactor,
  PhotoQuality,
  Locale,
  Dimensions,
  ArtStyle,
} from '@/types'

interface AppState {
  // Model
  modelStatus: ModelStatus
  modelProgress: number
  backend: Backend

  // Compat
  compatLevel: CompatLevel

  // File
  originalFile: File | null
  originalFormat: ImageFormat | null
  originalDataUrl: string | null
  originalDimensions: Dimensions | null
  croppedBlob: Blob | null
  croppedDimensions: Dimensions | null

  // Processing
  processingStatus: ProcessingStatus
  processingProgress: number
  processingError: string | null
  processingElapsed: number | null   // ms, null until done
  resultBlob: Blob | null
  resultDimensions: Dimensions | null
  abortController: AbortController | null

  // Settings
  scaleFactor: ScaleFactor
  artStyle: ArtStyle
  photoQuality: PhotoQuality
  locale: Locale
}

interface AppActions {
  setModelStatus: (status: ModelStatus) => void
  setModelProgress: (progress: number) => void
  setBackend: (backend: Backend) => void
  setCompatLevel: (level: CompatLevel) => void

  setOriginalFile: (
    file: File,
    format: ImageFormat,
    dataUrl: string,
    dimensions: Dimensions,
  ) => void
  setCroppedBlob: (blob: Blob | null, dimensions?: Dimensions | null) => void

  setProcessingStatus: (status: ProcessingStatus) => void
  setProcessingError: (msg: string | null) => void
  setProcessingProgress: (progress: number) => void
  setProcessingElapsed: (ms: number | null) => void
  setResult: (blob: Blob, dimensions: Dimensions) => void
  setAbortController: (controller: AbortController | null) => void

  setScaleFactor: (scale: ScaleFactor) => void
  setArtStyle: (style: ArtStyle) => void
  setPhotoQuality: (quality: PhotoQuality) => void
  setLocale: (locale: Locale) => void

  reset: () => void
}

const initialState: AppState = {
  modelStatus: 'idle',
  modelProgress: 0,
  backend: null,
  compatLevel: 'full',
  originalFile: null,
  originalFormat: null,
  originalDataUrl: null,
  originalDimensions: null,
  croppedBlob: null,
  croppedDimensions: null,
  processingStatus: 'idle',
  processingProgress: 0,
  processingError: null,
  processingElapsed: null,
  resultBlob: null,
  resultDimensions: null,
  abortController: null,
  scaleFactor: 2,
  artStyle: 'photo',
  photoQuality: 'fast',
  locale: 'en',
}

export const useAppStore = create<AppState & AppActions>((set) => ({
  ...initialState,

  setModelStatus: (modelStatus) => set({ modelStatus }),
  setModelProgress: (modelProgress) => set({ modelProgress }),
  setBackend: (backend) => set({ backend }),
  setCompatLevel: (compatLevel) => set({ compatLevel }),

  setOriginalFile: (originalFile, originalFormat, originalDataUrl, originalDimensions) =>
    set({ originalFile, originalFormat, originalDataUrl, originalDimensions }),
  setCroppedBlob: (croppedBlob, croppedDimensions = null) =>
    set({ croppedBlob, croppedDimensions }),

  setProcessingStatus: (processingStatus) => set({ processingStatus }),
  setProcessingError: (processingError) => set({ processingError }),
  setProcessingProgress: (processingProgress) =>
    set((state) =>
      state.processingProgress === processingProgress
        ? state
        : { processingProgress },
    ),
  setProcessingElapsed: (processingElapsed) => set({ processingElapsed }),
  setResult: (resultBlob, resultDimensions) =>
    set({ resultBlob, resultDimensions, processingStatus: 'done' }),
  setAbortController: (abortController) => set({ abortController }),

  setScaleFactor: (scaleFactor) => set({ scaleFactor }),
  setArtStyle: (artStyle) => set({ artStyle }),
  setPhotoQuality: (photoQuality) => set({ photoQuality }),
  setLocale: (locale) => set({ locale }),

  reset: () =>
    set((state) => ({
      ...initialState,
      // Persist settings + model state across resets
      modelStatus: state.modelStatus,
      modelProgress: state.modelProgress,
      backend: state.backend,
      compatLevel: state.compatLevel,
      scaleFactor: state.scaleFactor,
      artStyle: state.artStyle,
      photoQuality: state.photoQuality,
      locale: state.locale,
    })),
}))
