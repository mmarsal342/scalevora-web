/**
 * Single entry point for image decode that respects EXIF orientation.
 * iPhone photos and many camera files store orientation in EXIF —
 * canvas.drawImage ignores this, so the result would be rotated wrong
 * without this normalization.
 */
export async function normalizedImageBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}
