import type { ImageFormat, ScaleFactor, Dimensions } from '@/types'

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_DIMENSION_DESKTOP = 2048
export const MAX_DIMENSION_MOBILE = 1536

export function detectFormat(file: File): ImageFormat | null {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  if (type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg'))
    return 'jpg'
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

export function isMobileDevice(): boolean {
  return (
    /iPhone|Android/i.test(navigator.userAgent) || window.innerWidth < 768
  )
}

export function getDimensions(bitmap: ImageBitmap): Dimensions {
  return { width: bitmap.width, height: bitmap.height }
}

export function getLongestSide(dims: Dimensions): number {
  return Math.max(dims.width, dims.height)
}

export function computeOutputDimensions(
  input: Dimensions,
  scale: ScaleFactor,
): Dimensions {
  return { width: input.width * scale, height: input.height * scale }
}

export function pickPatchSize(longestSide: number): number {
  // Use a larger patch size (128). Smaller patch sizes (like 48)
  // create hundreds of patches for large images, which causes tf.tidy() to track
  // too many tensors and throw "RangeError: Set maximum size exceeded".
  return 128
}

/**
 * Output format matches input: JPG→JPG, PNG→PNG, HEIC→PNG.
 * Returns mime type and quality (quality undefined for PNG).
 */
export function outputFormatFor(input: ImageFormat): {
  mimeType: string
  extension: string
  quality?: number
} {
  switch (input) {
    case 'jpg':
      return { mimeType: 'image/jpeg', extension: 'jpg', quality: 0.95 }
    case 'png':
    case 'heic':
      return { mimeType: 'image/png', extension: 'png' }
  }
}

/**
 * Rough estimate for UI label. Real size varies with content entropy,
 * but order-of-magnitude is what users care about for "is this huge?".
 */
export function estimateOutputBytes(
  output: Dimensions,
  mimeType: string,
): number {
  const pixels = output.width * output.height
  if (mimeType === 'image/jpeg') {
    return Math.round(pixels * 0.5) // ~0.5 bytes/pixel at q=0.95
  }
  return Math.round(pixels * 2.5) // PNG roughly 2.5 bytes/pixel for photo content
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function buildOutputFilename(
  originalName: string,
  scale: ScaleFactor,
  extension: string,
): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image'
  return `scalevora_${base}_${scale}x.${extension}`
}
