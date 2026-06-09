import { create } from 'zustand'
import type {
  ModelStatus,
  ProcessingStatus,
  Backend,
  CompatLevel,
  ImageFormat,
  ScaleFactor,
  Locale,
  Dimensions,
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

  // Processing
  processingStatus: ProcessingStatus
  processingProgress: number
  resultBlob: Blob | null
  resultDimensions: Dimensions | null
  abortController: AbortController | null

  // Settings
  scaleFactor: ScaleFactor
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
  setCroppedBlob: (blob: Blob | null) => void

  setProcessingStatus: (status: ProcessingStatus) => void
  setProcessingProgress: (progress: number) => void
  setResult: (blob: Blob, dimensions: Dimensions) => void
  setAbortController: (controller: AbortController | null) => void

  setScaleFactor: (scale: ScaleFactor) => void
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
  processingStatus: 'idle',
  processingProgress: 0,
  resultBlob: null,
  resultDimensions: null,
  abortController: null,
  scaleFactor: 2,
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
  setCroppedBlob: (croppedBlob) => set({ croppedBlob }),

  setProcessingStatus: (processingStatus) => set({ processingStatus }),
  setProcessingProgress: (processingProgress) => set({ processingProgress }),
  setResult: (resultBlob, resultDimensions) =>
    set({ resultBlob, resultDimensions, processingStatus: 'done' }),
  setAbortController: (abortController) => set({ abortController }),

  setScaleFactor: (scaleFactor) => set({ scaleFactor }),
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
      locale: state.locale,
    })),
}))
