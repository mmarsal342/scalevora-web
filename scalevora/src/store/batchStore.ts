import { create } from 'zustand'
import type { BatchItem, ImageFormat, ScaleFactor, ArtStyle, PhotoQuality } from '@/types'

export const BATCH_MAX_FILES = 50

interface BatchState {
  items: BatchItem[]
  scaleFactor: ScaleFactor
  isRunning: boolean
  activeId: string | null
  autoDownload: boolean
  artStyle: ArtStyle
  photoQuality: PhotoQuality
}

interface BatchActions {
  addFiles: (files: FileList | File[]) => { added: number; skipped: number }
  updateItem: (id: string, patch: Partial<BatchItem>) => void
  removeItem: (id: string) => void
  setRunning: (v: boolean) => void
  setActiveId: (id: string | null) => void
  setScale: (scale: ScaleFactor) => void
  setAutoDownload: (v: boolean) => void
  setArtStyle: (style: ArtStyle) => void
  setPhotoQuality: (quality: PhotoQuality) => void
  clearAll: () => void
  removeCompleted: () => void
  retryItem: (id: string) => void
}

const initialState: BatchState = {
  items: [],
  scaleFactor: 2,
  isRunning: false,
  activeId: null,
  autoDownload: true,
  artStyle: 'photo',
  photoQuality: 'fast',
}

// Validate file type — returns format or null if unsupported
function detectBatchFormat(file: File): ImageFormat | null {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  if (type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpg'
  if (type === 'image/png' || name.endsWith('.png')) return 'png'
  if (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
    return 'heic'
  return null
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

export const useBatchStore = create<BatchState & BatchActions>((set, get) => ({
  ...initialState,

  addFiles: (files) => {
    const fileArr = Array.from(files)
    const existing = get().items
    let added = 0
    let skipped = 0

    const newItems: BatchItem[] = []
    for (const file of fileArr) {
      if (existing.length + newItems.length >= BATCH_MAX_FILES) {
        skipped += fileArr.length - added - skipped
        break
      }
      const format = detectBatchFormat(file)
      if (!format || file.size > MAX_FILE_BYTES) {
        skipped++
        continue
      }
      newItems.push({
        id: crypto.randomUUID(),
        file,
        format,
        status: 'queued',
        progress: 0,
        dimensions: null,
        resultBlob: null,
        resultDimensions: null,
        error: null,
        elapsedMs: null,
      })
      added++
    }

    set({ items: [...existing, ...newItems] })
    return { added, skipped }
  },

  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

  setRunning: (isRunning) => set({ isRunning }),
  setActiveId: (activeId) => set({ activeId }),
  setScale: (scaleFactor) => set({ scaleFactor }),
  setAutoDownload: (autoDownload) => set({ autoDownload }),
  setArtStyle: (artStyle) => set({ artStyle }),
  setPhotoQuality: (photoQuality) => set({ photoQuality }),
  clearAll: () => set({ items: [], isRunning: false, activeId: null }),

  removeCompleted: () =>
    set((state) => ({
      items: state.items.filter((i) => i.status !== 'done' && i.status !== 'saved'),
    })),

  retryItem: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, status: 'queued', error: null, elapsedMs: null, progress: 0 } : i
      ),
    })),
}))

// Helper selectors
export const selectQueuedItems = (state: BatchState) =>
  state.items.filter((i) => i.status === 'queued')

export const selectDoneCount = (state: BatchState) =>
  state.items.filter((i) => i.status === 'done' || i.status === 'saved').length

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke after a tick — browser needs it briefly for the download dialog
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function buildBatchFilename(
  originalName: string,
  scale: ScaleFactor,
  format: ImageFormat,
): string {
  const ext = format === 'heic' ? 'png' : format
  const base = originalName.replace(/\.[^.]+$/, '') || 'image'
  return `scalevora_${base}_${scale}x.${ext}`
}
