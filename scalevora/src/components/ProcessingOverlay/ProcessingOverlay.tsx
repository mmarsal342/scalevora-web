import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useUpscaler } from '@/hooks/useUpscaler'

function formatETA(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'calculating…'
  if (seconds < 60) return `~${Math.round(seconds)}s remaining`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `~${m}m ${s}s remaining`
}

export function ProcessingOverlay() {
  const status = useAppStore((s) => s.processingStatus)
  const progress = useAppStore((s) => s.processingProgress)
  const errorMsg = useAppStore((s) => s.processingError)
  const { cancelUpscale } = useUpscaler()

  const startedAtRef = useRef<number | null>(null)
  const [eta, setEta] = useState<string>('calculating…')

  useEffect(() => {
    if (status === 'processing' && startedAtRef.current === null) {
      startedAtRef.current = performance.now()
    }
    if (status !== 'processing' && status !== 'cancelling') {
      startedAtRef.current = null
    }
  }, [status])

  useEffect(() => {
    if (status !== 'processing') return
    const start = startedAtRef.current
    if (start === null || progress <= 0) return
    const elapsedSec = (performance.now() - start) / 1000
    const rate = progress / elapsedSec
    const remaining = (100 - progress) / rate
    setEta(formatETA(remaining))
  }, [progress, status])

  if (status !== 'processing' && status !== 'cancelling' && status !== 'error') return null

  // ── Error state ────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 px-6 backdrop-blur-md">
        <div className="relative w-full max-w-md border border-error/50 bg-surface p-10">
          <span className="absolute left-2 top-2 h-3 w-3 border-l border-t border-error" />
          <span className="absolute right-2 top-2 h-3 w-3 border-r border-t border-error" />
          <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-error" />
          <span className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-error" />

          <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-error">
            <span className="h-px w-6 bg-error" />
            Upscale Failed
          </span>

          <p className="mt-4 font-display text-2xl font-bold tracking-tight text-text">
            Something went wrong
          </p>

          <p className="mt-3 font-mono text-[12px] leading-relaxed text-muted">
            {errorMsg ?? 'An unexpected error occurred. Please try again.'}
          </p>

          <button
            onClick={() => useAppStore.getState().setProcessingStatus('idle')}
            className="mt-8 border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted hover:border-accent hover:text-text"
          >
            Dismiss &amp; Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 px-6 backdrop-blur-md">
      <div className="relative w-full max-w-md border border-border bg-surface p-10">
        {/* Corner ticks */}
        <span className="absolute left-2 top-2 h-3 w-3 border-l border-t border-accent" />
        <span className="absolute right-2 top-2 h-3 w-3 border-r border-t border-accent" />
        <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-accent" />
        <span className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-accent" />

        <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-accent">
          <span className="h-px w-6 bg-accent" />
          {status === 'cancelling' ? 'Cancelling' : 'Processing'}
        </span>

        <p className="mt-4 font-display text-2xl font-bold tracking-tight text-text">
          {status === 'cancelling' ? 'Cancelling…' : 'Upscaling…'}
        </p>

        <div className="mt-6 h-[2px] w-full overflow-hidden bg-border">
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted">
          {progress}% ·{' '}
          <span className="text-text">
            {status === 'processing' ? eta : 'finishing current tile'}
          </span>
        </p>

        <button
          onClick={cancelUpscale}
          disabled={status === 'cancelling'}
          className="mt-8 border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted hover:border-error hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'cancelling' ? 'Cancelling…' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}
