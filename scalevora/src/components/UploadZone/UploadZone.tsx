import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { useImageFile } from '@/hooks/useImageFile'
import { useLocale } from '@/hooks/useLocale'

export function UploadZone() {
  const { handleFile, isLoading, error, clearError } = useImageFile()
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

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

        {/* Corner ticks for that brand precision feel */}
        <span className="absolute left-2 top-2 h-3 w-3 border-l border-t border-border group-hover:border-accent" />
        <span className="absolute right-2 top-2 h-3 w-3 border-r border-t border-border group-hover:border-accent" />
        <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-border group-hover:border-accent" />
        <span className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-border group-hover:border-accent" />

        {isLoading ? (
          <p className="text-center font-display text-2xl text-text">
            Reading image…
          </p>
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
