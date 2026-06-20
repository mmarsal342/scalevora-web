import type { ImageFormat, ScaleFactor, Dimensions } from '@/types'

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_DIMENSION_DESKTOP = 2048
export const MAX_DIMENSION_MOBILE = 1536

// Maximum pixel dimension for the OUTPUT image.
// Exceeding this causes TF.js to overflow its internal tensor-tracking Set
// ("RangeError: Set maximum size exceeded") or exceed WebGL max texture size.
// At 4x: max INPUT = 1024px per side → output 4096px
// At 2x: max INPUT = 2048px per side → output 4096px
export const MAX_OUTPUT_SIDE = 4096

/**
 * Returns an error string if the upscaled output would be too large to process,
 * or null if dimensions are safe.
 */
export function checkOutputSize(
  input: Dimensions,
  scale: ScaleFactor,
): string | null {
  const outW = input.width * scale
  const outH = input.height * scale
  if (outW > MAX_OUTPUT_SIDE || outH > MAX_OUTPUT_SIDE) {
    const maxInputSide = Math.floor(MAX_OUTPUT_SIDE / scale)
    return (
      `Image too large for ${scale}x upscale ` +
      `(output would be ${outW}×${outH}px). ` +
      `Max input size for ${scale}x is ${maxInputSide}×${maxInputSide}px. ` +
      `Try 2x scale instead.`
    )
  }
  return null
}

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

export function pickPatchSize(_longestSide: number): number {
  return 128
}

/**
 * Applies an unsharp mask to a canvas IN-PLACE (post-upscale sharpening).
 * Uses CSS blur filter for the blurred reference — hardware-accelerated and fast.
 * amount: 0.0 (no effect) – 1.0 (strong). Default 0.4 is subtle but noticeable.
 */
export function applyUnsharpMask(
  canvas: HTMLCanvasElement,
  amount = 0.4,
  radius = 1,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas

  // Capture original pixels
  const original = ctx.getImageData(0, 0, width, height)

  // Create blurred copy via CSS filter (GPU path in most browsers)
  const blurCanvas = document.createElement('canvas')
  blurCanvas.width = width
  blurCanvas.height = height
  const blurCtx = blurCanvas.getContext('2d')!
  blurCtx.filter = `blur(${radius}px)`
  blurCtx.drawImage(canvas, 0, 0)
  const blurred = blurCtx.getImageData(0, 0, width, height)

  // Unsharp mask: result = clamp(orig + amount × (orig − blurred))
  const s = original.data
  const b = blurred.data
  for (let i = 0; i < s.length; i += 4) {
    s[i]     = Math.max(0, Math.min(255, s[i]     + amount * (s[i]     - b[i])))
    s[i + 1] = Math.max(0, Math.min(255, s[i + 1] + amount * (s[i + 1] - b[i + 1])))
    s[i + 2] = Math.max(0, Math.min(255, s[i + 2] + amount * (s[i + 2] - b[i + 2])))
    // alpha (i+3) unchanged
  }
  ctx.putImageData(original, 0, 0)
}

export interface ScaleSuggestion {
  recommended: ScaleFactor
  x2Label: string   // e.g. "2048×1536 · FHD"
  x4Label: string   // e.g. "4096×3072 · 4K"
  reason: string    // one-liner hint
}

/**
 * Given input dimensions, returns human-readable output sizes for each scale
 * and a recommended scale factor based on the input resolution.
 */
export function suggestScale(input: Dimensions): ScaleSuggestion {
  const longest = Math.max(input.width, input.height)

  function qualityBadge(side: number): string {
    if (side >= 3840) return ' · 4K'
    if (side >= 2560) return ' · QHD'
    if (side >= 1920) return ' · FHD'
    if (side >= 1280) return ' · HD'
    return ''
  }

  const w2 = input.width * 2,  h2 = input.height * 2
  const w4 = input.width * 4,  h4 = input.height * 4

  const x2Label = `${w2}×${h2}${qualityBadge(Math.max(w2, h2))}`
  const x4Label = `${w4}×${h4}${qualityBadge(Math.max(w4, h4))}`

  // Recommend 2× if input is already high-res or 4× would be huge
  const recommend2x = longest > 1440 || Math.max(w4, h4) > 6000
  return {
    recommended: recommend2x ? 2 : 4,
    x2Label,
    x4Label,
    reason: recommend2x
      ? longest > 1440
        ? 'Image is already high-res — 2× keeps quality without overloading GPU'
        : '4× output would be very large — 2× recommended'
      : '4× recommended for maximum sharpness',
  }
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
