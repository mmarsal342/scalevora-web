import { useBatchStore, triggerDownload, buildBatchFilename, BATCH_MAX_FILES } from '@/store/batchStore'
import { useBatchUpscaler } from '@/hooks/useBatchUpscaler'
import { useLocale } from '@/hooks/useLocale'
import { BatchUploadZone } from '@/components/BatchUploadZone/BatchUploadZone'
import type { BatchItem } from '@/types'

function StatusBadge({ status, progress }: { status: BatchItem['status']; progress: number }) {
  if (status === 'processing') {
    return (
      <div className="flex flex-col gap-1">
        <div className="h-1 w-full overflow-hidden bg-elevated">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
          {progress}% · Upscaling…
        </span>
      </div>
    )
  }
  if (status === 'done') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-success">
        ✓ Done
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
        ✓ Saved
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-error">
        ✕ Error
      </span>
    )
  }
  // queued
  return (
    <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
      — Queued
    </span>
  )
}

function QueueRow({ item, scale, autoDownload }: { item: BatchItem; scale: number; autoDownload: boolean }) {
  const { removeItem } = useBatchStore()
  const canRemove = item.status === 'queued' || item.status === 'error' || item.status === 'done' || item.status === 'saved'

  function handleSave() {
    if (!item.resultBlob) return
    triggerDownload(
      item.resultBlob,
      buildBatchFilename(item.file.name, scale as 2 | 4, item.format),
    )
    useBatchStore.getState().updateItem(item.id, { status: 'saved', resultBlob: null })
  }

  return (
    <div className="flex items-start gap-4 border-b border-border px-4 py-4 last:border-b-0">
      {/* Thumbnail placeholder */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-border bg-elevated text-lg">
        {item.status === 'done' || item.status === 'saved' ? '✓' : '🖼'}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate font-mono text-xs text-text" title={item.file.name}>
          {item.file.name}
        </p>
        {item.dimensions && (
          <p className="font-mono text-[10px] text-muted">
            {item.dimensions.width}×{item.dimensions.height}
            {item.resultDimensions && (
              <span className="text-text">
                {' → '}
                {item.resultDimensions.width}×{item.resultDimensions.height}
              </span>
            )}
          </p>
        )}
        <StatusBadge status={item.status} progress={item.progress} />
        {item.error && (
          <p className="font-mono text-[10px] uppercase tracking-wider text-error">
            {item.error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {item.status === 'done' && !autoDownload && item.resultBlob && (
          <button
            onClick={handleSave}
            className="border border-accent px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-accent hover:text-bg"
          >
            ↓ Save
          </button>
        )}
        {canRemove && (
          <button
            onClick={() => removeItem(item.id)}
            className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-error"
            aria-label="Remove"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

interface Props {
  onClearAll: () => void
}

export function BatchQueue({ onClearAll }: Props) {
  const { t } = useLocale()
  const { items, scaleFactor, isRunning, autoDownload, setScale, setAutoDownload } = useBatchStore()
  const { startBatch, cancelBatch } = useBatchUpscaler()

  const queuedCount = items.filter((i) => i.status === 'queued').length
  const doneCount = items.filter((i) => i.status === 'done' || i.status === 'saved').length
  const errorCount = items.filter((i) => i.status === 'error').length
  const allFinished = !isRunning && items.length > 0 && queuedCount === 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Scale selector */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Scale</span>
          {([2, 4] as const).map((s) => (
            <button
              key={s}
              onClick={() => !isRunning && setScale(s)}
              disabled={isRunning}
              className={`px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
                scaleFactor === s
                  ? 'bg-accent text-bg'
                  : 'border border-border text-muted hover:border-muted hover:text-text disabled:opacity-40'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Auto-download toggle */}
        <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          <input
            type="checkbox"
            checked={autoDownload}
            onChange={(e) => setAutoDownload(e.target.checked)}
            className="accent-accent"
          />
          {t('batch.autoDownload')}
        </label>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <>
              {queuedCount > 0 && (
                <button
                  onClick={() => void startBatch()}
                  className="bg-accent px-5 py-2 font-display text-sm font-bold tracking-wide text-bg transition-transform hover:-translate-y-0.5"
                >
                  {t('batch.start')} ({queuedCount})
                </button>
              )}
              <button
                onClick={onClearAll}
                className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-muted hover:text-text"
              >
                {t('batch.clear')}
              </button>
            </>
          ) : (
            <button
              onClick={cancelBatch}
              className="border border-error px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-error hover:bg-error hover:text-bg"
            >
              {t('batch.cancel')}
            </button>
          )}
        </div>
      </div>

      {/* Progress summary */}
      {items.length > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {items.length} {t('batch.files')} ·{' '}
          <span className="text-success">{doneCount} {t('batch.done')}</span>
          {errorCount > 0 && (
            <span className="text-error"> · {errorCount} {t('batch.errors')}</span>
          )}
          {queuedCount > 0 && !isRunning && (
            <span> · {queuedCount} {t('batch.queued')}</span>
          )}
        </p>
      )}

      {/* Queue list */}
      <div className="border border-border">
        {items.map((item) => (
          <QueueRow key={item.id} item={item} scale={scaleFactor} autoDownload={autoDownload} />
        ))}

        {/* Add more zone — only when not running and under limit */}
        {!isRunning && items.length < BATCH_MAX_FILES && (
          <div className="border-t border-border p-4">
            <BatchUploadZone onFilesAdded={() => {}} />
          </div>
        )}
      </div>

      {/* All done summary */}
      {allFinished && (
        <div className="border border-success/30 bg-success/5 px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-wider text-success">
            ✓ {t('batch.allDone')} — {doneCount}/{items.length} {t('batch.processed')}
          </p>
        </div>
      )}
    </div>
  )
}
