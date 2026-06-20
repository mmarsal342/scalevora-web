import { useAppStore } from '@/store/appStore'
import { isMobileDevice, suggestScale } from '@/utils/imageUtils'
import type { Dimensions, ScaleFactor } from '@/types'

interface ScaleSelectorProps {
  /** If provided, shows output dimension labels and a recommendation badge */
  inputDims?: Dimensions | null
}

export function ScaleSelector({ inputDims }: ScaleSelectorProps = {}) {
  const scale = useAppStore((s) => s.scaleFactor)
  const setScale = useAppStore((s) => s.setScaleFactor)
  const mobile = isMobileDevice()

  const suggestion = inputDims ? suggestScale(inputDims) : null

  function pick(next: ScaleFactor) {
    if (next === 4 && mobile) return
    setScale(next)
  }

  const base =
    'relative border px-5 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors'

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="inline-flex -space-x-px">
        {/* 2× button */}
        <button
          onClick={() => pick(2)}
          className={`${base} ${
            scale === 2
              ? 'border-accent bg-accent text-bg'
              : 'border-border bg-surface text-muted hover:text-text'
          }`}
        >
          <span>2×</span>
          {suggestion && (
            <span className={`ml-1.5 font-mono text-[9px] normal-case tracking-normal ${
              scale === 2 ? 'text-bg/70' : 'text-muted/70'
            }`}>
              {suggestion.x2Label}
            </span>
          )}
          {suggestion?.recommended === 2 && scale !== 2 && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-accent px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-bg">
              ✓ rec
            </span>
          )}
        </button>

        {/* 4× button */}
        <button
          onClick={() => pick(4)}
          disabled={mobile}
          title={mobile ? '4× requires desktop' : suggestion?.recommended === 4 ? suggestion.reason : undefined}
          className={`${base} ${
            mobile
              ? 'cursor-not-allowed border-border bg-surface text-muted opacity-40'
              : scale === 4
                ? 'border-accent bg-accent text-bg'
                : 'border-border bg-surface text-muted hover:text-text'
          }`}
        >
          <span>4×</span>
          {suggestion && !mobile && (
            <span className={`ml-1.5 font-mono text-[9px] normal-case tracking-normal ${
              scale === 4 ? 'text-bg/70' : 'text-muted/70'
            }`}>
              {suggestion.x4Label}
            </span>
          )}
          {suggestion?.recommended === 4 && scale !== 4 && !mobile && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-accent px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-bg">
              ✓ rec
            </span>
          )}
        </button>
      </div>

      {/* Reason hint when recommended scale isn't selected */}
      {suggestion && suggestion.recommended !== scale && (
        <p className="max-w-[260px] font-mono text-[10px] leading-snug text-muted">
          ↑ {suggestion.reason}
        </p>
      )}
    </div>
  )
}
