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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-accent">
      <span className="h-px w-6 bg-accent" />
      {children}
    </span>
  )
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
    <div className="relative">
      <ProcessingOverlay />

      {view === 'empty' && (
        <section className="relative min-h-[calc(100svh-68px-160px)] overflow-hidden px-6 py-16 md:px-10 md:py-24">
          <div className="hero-grid" />
          <div className="hero-glow" />
          <div className="hero-glow-2" />

          <div className="relative mx-auto max-w-5xl">
            <div className="fade-up">
              <SectionLabel>PT Modular Media Asia · Jakarta</SectionLabel>
            </div>

            <h1 className="fade-up fade-up-d1 mt-8 font-display text-6xl font-extrabold leading-[0.92] tracking-tightest md:text-8xl">
              <span className="text-muted font-normal">Scale</span>
              <span className="text-accent">Vora</span>
            </h1>

            <p className="fade-up fade-up-d2 mt-6 max-w-xl font-mono text-sm leading-relaxed text-muted md:text-base">
              {t('home.tagline')}
            </p>

            <div className="fade-up fade-up-d3 mt-12">
              <UploadZone />
            </div>

            <div className="fade-up fade-up-d3 mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-muted">
              <span>✓ {t('home.trust.noUpload')}</span>
              <span>✓ {t('home.trust.noSignup')}</span>
              <span>✓ {t('home.trust.offline')}</span>
            </div>
          </div>
        </section>
      )}

      {view === 'uploaded' && originalDataUrl && originalDimensions && (
        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8">
            <SectionLabel>Preview · Pick scale</SectionLabel>

            <img
              src={originalDataUrl}
              alt="Original preview"
              className="max-h-[60vh] border border-border"
            />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <ScaleSelector />
              <button
                onClick={() => void runUpscale()}
                className="bg-accent px-8 py-3 font-display text-sm font-bold tracking-wide text-bg transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,255,71,0.25)]"
              >
                Upscale ↑
              </button>
              <button
                onClick={reset}
                className="border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted hover:border-muted hover:text-text"
              >
                Reset
              </button>
            </div>

            {outputDims && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {originalDimensions.width}×{originalDimensions.height} →{' '}
                <span className="text-text">
                  {outputDims.width}×{outputDims.height}
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      {view === 'done' && resultUrl && resultDimensions && originalDimensions && (
        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8">
            <SectionLabel>Done</SectionLabel>

            <img
              src={resultUrl}
              alt="Upscaled result"
              className="max-h-[60vh] border border-border"
            />

            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {originalDimensions.width}×{originalDimensions.height} →{' '}
              <span className="text-text">
                {resultDimensions.width}×{resultDimensions.height}
              </span>{' '}
              · {scale}×
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <SaveButton />
              <button
                onClick={reset}
                className="border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted hover:border-muted hover:text-text"
              >
                Process new
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
