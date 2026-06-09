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

  const btnBase =
    'rounded-lg border px-4 py-2 font-mono text-sm transition-colors'

  return (
    <div className="inline-flex gap-2">
      <button
        onClick={() => pick(2)}
        className={`${btnBase} ${
          scale === 2
            ? 'border-accent bg-accent text-bg-primary'
            : 'border-border bg-bg-surface text-text-primary hover:border-accent/50'
        }`}
      >
        2×
      </button>
      <button
        onClick={() => pick(4)}
        disabled={mobile}
        title={mobile ? '4× requires desktop' : undefined}
        className={`${btnBase} ${
          mobile
            ? 'cursor-not-allowed border-border bg-bg-surface text-text-secondary opacity-50'
            : scale === 4
              ? 'border-accent bg-accent text-bg-primary'
              : 'border-border bg-bg-surface text-text-primary hover:border-accent/50'
        }`}
      >
        4×
      </button>
    </div>
  )
}
