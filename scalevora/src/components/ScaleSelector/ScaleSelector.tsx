import { useAppStore } from '@/store/appStore'
import { isMobileDevice } from '@/utils/imageUtils'
import type { ScaleFactor } from '@/types'

export function ScaleSelector() {
  const scale = useAppStore((s) => s.scaleFactor)
  const setScale = useAppStore((s) => s.setScaleFactor)
  const mobile = isMobileDevice()

  function pick(next: ScaleFactor) {
    if (next === 4 && mobile) return
    setScale(next)
  }

  const base =
    'border px-5 py-3 font-mono text-xs uppercase tracking-wider transition-colors'

  return (
    <div className="inline-flex -space-x-px">
      <button
        onClick={() => pick(2)}
        className={`${base} ${
          scale === 2
            ? 'border-accent bg-accent text-bg'
            : 'border-border bg-surface text-muted hover:text-text'
        }`}
      >
        2×
      </button>
      <button
        onClick={() => pick(4)}
        disabled={mobile}
        title={mobile ? '4× requires desktop' : undefined}
        className={`${base} ${
          mobile
            ? 'cursor-not-allowed border-border bg-surface text-muted opacity-40'
            : scale === 4
              ? 'border-accent bg-accent text-bg'
              : 'border-border bg-surface text-muted hover:text-text'
        }`}
      >
        4×
      </button>
    </div>
  )
}
