import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { useLocale } from '@/hooks/useLocale'
import { useUpscaler } from '@/hooks/useUpscaler'
import { UploadZone } from '@/components/UploadZone/UploadZone'
import { ScaleSelector } from '@/components/ScaleSelector/ScaleSelector'
import { ProcessingOverlay } from '@/components/ProcessingOverlay/ProcessingOverlay'
import { SaveButton } from '@/components/SaveButton/SaveButton'
import { computeOutputDimensions } from '@/utils/imageUtils'

type ViewState = 'empty' | 'uploaded' | 'done'

function useViewState(): ViewState {
  const original = useAppStore((s) => s.originalFile)
  const result = useAppStore((s) => s.resultBlob)
  if (result) return 'done'
  if (original) return 'uploaded'
  return 'empty'
}

export function Home() {
  const { t } = useLocale()
  const view = useViewState()
  const { runUpscale } = useUpscaler()
  const reset = useAppStore((s) => s.reset)

  const originalDataUrl = useAppStore((s) => s.originalDataUrl)
  const originalDimensions = useAppStore((s) => s.originalDimensions)
  const resultDimensions = useAppStore((s) => s.resultDimensions)
  const resultBlob = useAppStore((s) => s.resultBlob)
  const scale = useAppStore((s) => s.scaleFactor)

  const outputDims = useMemo(
    () =>
      originalDimensions
        ? computeOutputDimensions(originalDimensions, scale)
        : null,
    [originalDimensions, scale],
  )

  const resultUrl = useMemo(
    () => (resultBlob ? URL.createObjectURL(resultBlob) : null),
    [resultBlob],
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <ProcessingOverlay />

      {view === 'empty' && (
        <>
          <h1 className="text-center font-display text-5xl font-extrabold md:text-6xl">
            SCALEVORA
          </h1>
          <p className="mt-4 text-center font-body text-lg text-text-secondary">
            {t('home.tagline')}
          </p>

          <div className="mt-12">
            <UploadZone />
          </div>

          <div className="mt-6 flex justify-center gap-6 font-mono text-sm text-text-secondary">
            <span>✓ {t('home.trust.noUpload')}</span>
            <span>✓ {t('home.trust.noSignup')}</span>
            <span>✓ {t('home.trust.offline')}</span>
          </div>
        </>
      )}

      {view === 'uploaded' && originalDataUrl && originalDimensions && (
        <div className="flex flex-col items-center gap-6">
          <img
            src={originalDataUrl}
            alt="Original preview"
            className="max-h-[60vh] rounded-xl border border-border"
          />

          <div className="flex flex-wrap items-center justify-center gap-4">
            <ScaleSelector />
            <button
              onClick={reset}
              className="rounded-lg border border-border px-4 py-2 font-mono text-sm text-text-secondary hover:text-text-primary"
            >
              Reset
            </button>
            <button
              onClick={() => void runUpscale()}
              className="rounded-lg bg-accent px-6 py-2 font-mono text-sm font-medium text-bg-primary hover:scale-[1.02]"
            >
              Upscale →
            </button>
          </div>

          {outputDims && (
            <p className="font-mono text-xs text-text-secondary">
              {originalDimensions.width}×{originalDimensions.height} → {outputDims.width}×
              {outputDims.height}
            </p>
          )}
        </div>
      )}

      {view === 'done' && resultUrl && resultDimensions && originalDimensions && (
        <div className="flex flex-col items-center gap-6">
          <img
            src={resultUrl}
            alt="Upscaled result"
            className="max-h-[60vh] rounded-xl border border-border"
          />

          <p className="font-mono text-xs text-text-secondary">
            {originalDimensions.width}×{originalDimensions.height} →{' '}
            {resultDimensions.width}×{resultDimensions.height} · {scale}×
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <SaveButton />
            <button
              onClick={reset}
              className="rounded-lg border border-border px-4 py-2 font-mono text-sm text-text-primary hover:border-accent/50"
            >
              Process new
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
