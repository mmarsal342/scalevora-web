/**
 * Lazy-load heic2any only when a HEIC file is actually uploaded.
 * The 'heic' chunk (see vite.config.ts manualChunks) is split out
 * so non-HEIC users never pay the bundle cost.
 */
export async function convertHeicToPng(file: File): Promise<Blob> {
  const { default: heic2any } = await import('heic2any')
  const result = await heic2any({ blob: file, toType: 'image/png' })
  return Array.isArray(result) ? result[0] : result
}
