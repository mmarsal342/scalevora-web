import { useAppStore } from '@/store/appStore'
import { backendLabel } from '@/utils/compatUtils'

export function ModelLoader() {
  const status = useAppStore((s) => s.modelStatus)
  const progress = useAppStore((s) => s.modelProgress)
  const backend = useAppStore((s) => s.backend)

  if (status === 'idle') return null

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 font-mono text-xs text-muted">
        <span>Loading AI engine…</span>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span>{progress}%</span>
      </div>
    )
  }

  if (status === 'ready') {
    return (
      <span className="font-mono text-xs text-muted">
        {backendLabel(backend)}
      </span>
    )
  }

  return (
    <span className="font-mono text-xs text-error">
      ⚠ AI engine error
    </span>
  )
}
