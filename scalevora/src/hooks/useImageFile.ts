import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { normalizedImageBitmap } from '@/utils/exifUtils'
import { convertHeicToPng } from '@/utils/heicUtils'
import {
  MAX_FILE_SIZE_BYTES,
  MAX_DIMENSION_DESKTOP,
  MAX_DIMENSION_MOBILE,
  detectFormat,
  formatBytes,
  getDimensions,
  getLongestSide,
  isMobileDevice,
} from '@/utils/imageUtils'

interface UseImageFileResult {
  handleFile: (file: File) => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export function useImageFile(): UseImageFileResult {
  const setOriginalFile = useAppStore((s) => s.setOriginalFile)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File): Promise<void> {
    setError(null)

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(
        `File too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
      )
      return
    }

    const format = detectFormat(file)
    if (!format) {
      setError('Unsupported format. Use JPG, PNG, or HEIC.')
      return
    }

    setIsLoading(true)

    try {
      // HEIC → PNG before anything else touches it.
      const decodableBlob: Blob =
        format === 'heic' ? await convertHeicToPng(file) : file

      // EXIF normalize: single entry point for all image decode.
      const bitmap = await normalizedImageBitmap(decodableBlob)
      const dimensions = getDimensions(bitmap)

      const longest = getLongestSide(dimensions)
      const mobile = isMobileDevice()
      const dimensionCap = mobile ? MAX_DIMENSION_MOBILE : MAX_DIMENSION_DESKTOP

      if (longest > dimensionCap) {
        const ok = window.confirm(
          mobile
            ? `Large image (${dimensions.width}×${dimensions.height}). May cause tab reload on mobile. Continue?`
            : `Large image (${dimensions.width}×${dimensions.height}). Processing may take 60s+. Continue?`,
        )
        if (!ok) {
          bitmap.close()
          setIsLoading(false)
          return
        }
      }

      // Preview URL — note: drawing the bitmap to a canvas would also work,
      // but for the preview we just want something cheap and revocable.
      const previewBlob =
        format === 'heic'
          ? decodableBlob
          : await new Promise<Blob>((resolve) => {
              const canvas = document.createElement('canvas')
              canvas.width = dimensions.width
              canvas.height = dimensions.height
              const ctx = canvas.getContext('2d')!
              ctx.drawImage(bitmap, 0, 0)
              canvas.toBlob((b) => resolve(b!), 'image/png')
            })
      const dataUrl = URL.createObjectURL(previewBlob)

      bitmap.close()
      setOriginalFile(file, format, dataUrl, dimensions)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to read image.'
      setError(`Could not read image — ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    handleFile,
    isLoading,
    error,
    clearError: () => setError(null),
  }
}
