import type { Crop, PixelCrop } from 'react-image-crop'
import { normalizedImageBitmap } from './exifUtils'

/**
 * A "no-crop" starting selection that covers the whole image. We don't lock an
 * aspect ratio — users picking 9:16 for vertical Reels need full freedom.
 */
export function defaultCrop(): Crop {
  return { unit: '%', x: 0, y: 0, width: 100, height: 100 }
}

/**
 * Pull the selected region out of the source blob into a fresh PNG blob.
 * We always go through createImageBitmap with imageOrientation: 'from-image'
 * so EXIF rotation is handled identically to the main upscale path —
 * cropping a phone photo must not silently re-introduce orientation drift.
 */
export async function getCroppedBlob(
  source: Blob,
  crop: PixelCrop,
): Promise<Blob> {
  const bitmap = await normalizedImageBitmap(source)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(crop.width)
  canvas.height = Math.round(crop.height)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas 2D context unavailable')
  }

  ctx.drawImage(
    bitmap,
    Math.round(crop.x),
    Math.round(crop.y),
    Math.round(crop.width),
    Math.round(crop.height),
    0,
    0,
    Math.round(crop.width),
    Math.round(crop.height),
  )
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Canvas.toBlob returned null')),
      'image/png',
    )
  })
}
