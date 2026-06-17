import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { useImageFile } from '@/hooks/useImageFile'
import { useLocale } from '@/hooks/useLocale'

type UploadMode = 'single' | 'batch'

interface SingleProps {
  onBatchMode: () => void
}

function ModeToggle({ mode, onChange }: { mode: UploadMode; onChange: (m: UploadMode) => void }) {
  const { t } = useLocale()
  return (
    <div className="mb-4 flex items-center gap-0.5">
      {(['single', 'batch'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
            mode === m
              ? 'bg-accent text-bg font-bold'
              : 'border border-border text-muted hover:border-muted hover:text-text'
          }`}
        >
          {m === 'single' ? t('upload.single') : t('upload.batch')}
        </button>
      ))}
    </div>
  )
}

export function UploadZone({ onBatchMode }: SingleProps) {
  const { handleFile, isLoading, error, clearError } = useImageFile()
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [mode, setMode] = useState<UploadMode>('single')

  function handleModeChange(m: UploadMode) {
    setMode(m)
    if (m === 'batch') onBatchMode()
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      clearError()
      void handleFile(file)
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      clearError()
      void handleFile(file)
    }
    e.target.value = ''
  }

  return (
    <div className="w-full">
      <ModeToggle mode={mode} onChange={handleModeChange} />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`group relative cursor-pointer border border-dashed p-12 transition-all md:p-20 ${
          isDragOver
            ? 'border-accent bg-surface'
            : 'border-border bg-surface/40 hover:border-accent/40 hover:bg-surface'
        } ${error ? 'border-error' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          onChange={onChange}
          className="hidden"
        />

        {/* Corner ticks */}
        <span className="absolute left-2 top-2 h-3 w-3 border-l border-t border-border group-hover:border-accent" />
        <span className="absolute right-2 top-2 h-3 w-3 border-r border-t border-border group-hover:border-accent" />
        <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-border group-hover:border-accent" />
        <span className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-border group-hover:border-accent" />

        {isLoading ? (
          <p className="text-center font-display text-2xl text-text">Reading image…</p>
        ) : (
          <>
            <p className="text-center font-display text-2xl font-bold tracking-tight text-text md:text-3xl">
              {t('home.upload.cta')}
            </p>
            <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted">
              {t('home.upload.formats')}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-center font-mono text-xs uppercase tracking-wider text-error">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
