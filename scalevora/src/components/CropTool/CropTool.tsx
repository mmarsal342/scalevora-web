import { useRef, useState } from 'react'
import ReactCrop, {
  type Crop,
  type PixelCrop,
} from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useAppStore } from '@/store/appStore'
import { defaultCrop, getCroppedBlob } from '@/utils/cropUtils'
import { computeOutputDimensions } from '@/utils/imageUtils'

interface CropToolProps {
  onSkip: () => void
  onApply: () => void
}

/**
 * react-image-crop returns coords in the rendered <img>'s CSS pixel space.
 * Our source blob is at natural resolution — we need to scale before we
 * draw to canvas, or the crop region (and reported size) is wrong.
 */
function toNaturalCrop(
  crop: PixelCrop,
  img: HTMLImageElement,
): PixelCrop {
  const sx = img.naturalWidth / img.width
  const sy = img.naturalHeight / img.height
  return {
    unit: 'px',
    x: Math.round(crop.x * sx),
    y: Math.round(crop.y * sy),
    width: Math.round(crop.width * sx),
    height: Math.round(crop.height * sy),
  }
}

export function CropTool({ onSkip, onApply }: CropToolProps) {
  const originalFile = useAppStore((s) => s.originalFile)
  const originalDataUrl = useAppStore((s) => s.originalDataUrl)
  const originalDimensions = useAppStore((s) => s.originalDimensions)
  const scale = useAppStore((s) => s.scaleFactor)
  const setCroppedBlob = useAppStore((s) => s.setCroppedBlob)

  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>(defaultCrop())
  const [displayCrop, setDisplayCrop] = useState<PixelCrop | null>(null)
  const [busy, setBusy] = useState(false)

  if (!originalFile || !originalDataUrl || !originalDimensions) return null

  // The natural-pixel crop derived from the current display selection.
  const naturalCrop: PixelCrop | null =
    displayCrop && imgRef.current ? toNaturalCrop(displayCrop, imgRef.current) : null

  const cropDims = naturalCrop
    ? { width: naturalCrop.width, height: naturalCrop.height }
    : originalDimensions

  const output = computeOutputDimensions(cropDims, scale)

  async function apply() {
    if (!originalFile) return

    // No active selection (user opened crop, didn't drag) → equivalent to skip.
    if (!naturalCrop) {
      setCroppedBlob(null)
      onApply()
      return
    }

    setBusy(true)
    try {
      const blob = await getCroppedBlob(originalFile, naturalCrop)
      setCroppedBlob(blob, {
        width: naturalCrop.width,
        height: naturalCrop.height,
      })
      onApply()
    } finally {
      setBusy(false)
    }
  }

  function skip() {
    setCroppedBlob(null)
    onSkip()
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="max-h-[60vh] overflow-hidden border border-border">
        <ReactCrop
          crop={crop}
          onChange={(_px, percent) => setCrop(percent)}
          onComplete={(c) => setDisplayCrop(c)}
          minWidth={48}
          minHeight={48}
          keepSelection
        >
          <img
            ref={imgRef}
            src={originalDataUrl}
            alt="Crop source"
            style={{ maxHeight: '60vh', display: 'block' }}
          />
        </ReactCrop>
      </div>

      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
        Crop:{' '}
        <span className="text-text">
          {cropDims.width}×{cropDims.height}
        </span>
        {' · '}
        Output {scale}×:{' '}
        <span className="text-text">
          {output.width}×{output.height}
        </span>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={skip}
          disabled={busy}
          className="border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted hover:border-muted hover:text-text disabled:opacity-50"
        >
          Skip crop
        </button>
        <button
          onClick={() => void apply()}
          disabled={busy}
          className="bg-accent px-7 py-3 font-display text-sm font-bold tracking-wide text-bg transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,255,71,0.25)] disabled:opacity-60"
        >
          {busy ? 'Cropping…' : 'Apply crop ↑'}
        </button>
      </div>
    </div>
  )
}
