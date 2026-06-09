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
    const rate = progress / elapsedSec // %/sec
    const remaining = (100 - progress) / rate
    setEta(formatETA(remaining))
  }, [progress, status])

  if (status !== 'processing' && status !== 'cancelling') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-8 text-center">
        <p className="font-display text-2xl text-text-primary">
          {status === 'cancelling' ? 'Cancelling…' : 'Upscaling…'}
        </p>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 font-mono text-sm text-text-secondary">
          {progress}% · {status === 'processing' ? eta : 'finishing current tile'}
        </p>

        <button
          onClick={cancelUpscale}
          disabled={status === 'cancelling'}
          className="mt-6 rounded-lg border border-border px-4 py-2 font-mono text-sm text-text-primary hover:border-error hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'cancelling' ? 'Cancelling…' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}
