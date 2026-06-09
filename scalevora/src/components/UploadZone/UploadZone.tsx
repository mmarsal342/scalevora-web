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
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all md:p-16 ${
          isDragOver
            ? 'scale-[1.01] border-accent bg-bg-elevated'
            : 'border-border bg-bg-surface hover:border-accent/50'
        } ${error ? 'border-error' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          onChange={onChange}
          className="hidden"
        />
        {isLoading ? (
          <p className="font-display text-2xl text-text-primary">Reading image…</p>
        ) : (
          <>
            <p className="font-display text-2xl text-text-primary">
              {t('home.upload.cta')}
            </p>
            <p className="mt-2 font-mono text-sm text-text-secondary">
              {t('home.upload.formats')}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-center font-mono text-sm text-error">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
