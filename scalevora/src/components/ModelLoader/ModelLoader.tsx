import { useAppStore } from '@/store/appStore'
import { backendLabel, isCpuMode } from '@/utils/compatUtils'

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
    const cpuMode = isCpuMode(backend)
    return (
      <span
        className={`font-mono text-xs ${cpuMode ? 'text-yellow-400' : 'text-muted'}`}
        title={
          cpuMode
            ? 'Your GPU does not support the required WebGL shaders. Running in CPU mode — upscaling will be slower but fully functional.'
            : undefined
        }
      >
        {backendLabel(backend)}
        {cpuMode && ' ⚠'}
      </span>
    )
  }

  return (
    <span className="font-mono text-xs text-error">
      ⚠ AI engine error
    </span>
  )
}
