import { useAppStore } from '@/store/appStore'
import {
  buildOutputFilename,
  estimateOutputBytes,
  formatBytes,
  outputFormatFor,
} from '@/utils/imageUtils'

export function SaveButton() {
  const resultBlob = useAppStore((s) => s.resultBlob)
  const resultDimensions = useAppStore((s) => s.resultDimensions)
  const originalFile = useAppStore((s) => s.originalFile)
  const originalFormat = useAppStore((s) => s.originalFormat)
  const scale = useAppStore((s) => s.scaleFactor)

  if (!resultBlob || !resultDimensions || !originalFile || !originalFormat) {
    return null
  }

  const cfg = outputFormatFor(originalFormat)
  const filename = buildOutputFilename(originalFile.name, scale, cfg.extension)
  // Prefer the real blob size — accurate now that we have the actual bytes.
  const sizeLabel = formatBytes(
    resultBlob.size > 0
      ? resultBlob.size
      : estimateOutputBytes(resultDimensions, cfg.mimeType),
  )

  function save() {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={save}
      className="inline-flex items-center gap-2 bg-accent px-7 py-3 font-display text-sm font-bold tracking-wide text-bg transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,255,71,0.25)]"
    >
      <span>↓ Save {scale}× {cfg.extension.toUpperCase()}</span>
      <span className="font-mono text-[10px] font-normal uppercase tracking-wider opacity-70">
        {sizeLabel}
      </span>
    </button>
  )
}
