import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { useBatchStore, BATCH_MAX_FILES } from '@/store/batchStore'
import { useLocale } from '@/hooks/useLocale'

interface Props {
  onFilesAdded: () => void
}

export function BatchUploadZone({ onFilesAdded }: Props) {
  const { t } = useLocale()
  const { addFiles, items } = useBatchStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const remaining = BATCH_MAX_FILES - items.length

  function processFiles(files: FileList | File[]) {
    if (remaining <= 0) {
      setFeedback(`Max ${BATCH_MAX_FILES} files per batch.`)
      return
    }
    const { added, skipped } = addFiles(files)
    if (added > 0) {
      onFilesAdded()
      setFeedback(
        skipped > 0
          ? `${added} added, ${skipped} skipped (wrong format or >10MB)`
          : null,
      )
    } else if (skipped > 0) {
      setFeedback('No valid files — use JPG, PNG, or HEIC under 10MB.')
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    processFiles(e.dataTransfer.files)
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`group relative cursor-pointer border border-dashed p-12 transition-all md:p-16 ${
          isDragOver
            ? 'border-accent bg-surface'
            : 'border-border bg-surface/40 hover:border-accent/40 hover:bg-surface'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          multiple
          onChange={onChange}
          className="hidden"
        />

        {/* Corner ticks */}
        <span className="absolute left-2 top-2 h-3 w-3 border-l border-t border-border group-hover:border-accent" />
        <span className="absolute right-2 top-2 h-3 w-3 border-r border-t border-border group-hover:border-accent" />
        <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-border group-hover:border-accent" />
        <span className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-border group-hover:border-accent" />

        <p className="text-center font-display text-2xl font-bold tracking-tight text-text md:text-3xl">
          {t('batch.upload.cta')}
        </p>
        <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted">
          {t('home.upload.formats')} · {t('batch.upload.multi')}
        </p>
        {remaining < BATCH_MAX_FILES && (
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-accent">
            {items.length} / {BATCH_MAX_FILES} {t('batch.upload.filesLoaded')}
          </p>
        )}
      </div>

      {feedback && (
        <p className="mt-3 text-center font-mono text-xs uppercase tracking-wider text-accent2">
          ⚠ {feedback}
        </p>
      )}
    </div>
  )
}
