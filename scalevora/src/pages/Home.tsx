import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useLocale } from '@/hooks/useLocale'
import { useUpscaler } from '@/hooks/useUpscaler'
import { UploadZone } from '@/components/UploadZone/UploadZone'
import { ScaleSelector } from '@/components/ScaleSelector/ScaleSelector'
import { ProcessingOverlay } from '@/components/ProcessingOverlay/ProcessingOverlay'
import { SaveButton } from '@/components/SaveButton/SaveButton'
import { CropTool } from '@/components/CropTool/CropTool'
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider/BeforeAfterSlider'
import { computeOutputDimensions } from '@/utils/imageUtils'

type ViewState = 'empty' | 'cropping' | 'preview' | 'done'

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
  const { runUpscale } = useUpscaler()
  const reset = useAppStore((s) => s.reset)

  const originalFile = useAppStore((s) => s.originalFile)
  const originalDataUrl = useAppStore((s) => s.originalDataUrl)
  const originalDimensions = useAppStore((s) => s.originalDimensions)
  const croppedBlob = useAppStore((s) => s.croppedBlob)
  const resultDimensions = useAppStore((s) => s.resultDimensions)
  const resultBlob = useAppStore((s) => s.resultBlob)
  const scale = useAppStore((s) => s.scaleFactor)

  // 'cropping' is the default once an image is loaded — users coming for
  // reframing land in the right place by default. They can Skip to go
  // straight to preview, which keeps the full image.
  const [stage, setStage] = useState<'cropping' | 'preview'>('cropping')

  // Reset the local stage whenever the source image changes (new upload).
  useEffect(() => {
    if (originalFile) {
      setStage('cropping')
    }
  }, [originalFile])

  const view: ViewState = useMemo(() => {
    if (resultBlob) return 'done'
    if (!originalFile) return 'empty'
    return stage
  }, [resultBlob, originalFile, stage])

  // Cropped preview URL (only used in the preview stage when a crop is set).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!croppedBlob) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(croppedBlob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [croppedBlob])

  // Result preview URL.
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!resultBlob) {
      setResultUrl(null)
      return
    }
    const url = URL.createObjectURL(resultBlob)
    setResultUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [resultBlob])

  // Input dimensions for stats: cropped if available, otherwise original.
  const inputDims = useMemo(() => {
    if (!originalDimensions) return null
    // We don't track cropped dimensions in the store; if there's a crop,
    // result dims / scale gives us the input dims after the fact.
    if (resultDimensions) {
      return {
        width: resultDimensions.width / scale,
        height: resultDimensions.height / scale,
      }
    }
    return originalDimensions
  }, [originalDimensions, resultDimensions, scale])

  const previewDims = useMemo(
    () =>
      originalDimensions
        ? computeOutputDimensions(originalDimensions, scale)
        : null,
    [originalDimensions, scale],
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

      {view === 'cropping' && originalDataUrl && originalDimensions && (
        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8">
            <SectionLabel>{t('crop.label')}</SectionLabel>
            <div className="flex items-center">
              <ScaleSelector />
            </div>
            <CropTool
              onSkip={() => setStage('preview')}
              onApply={() => setStage('preview')}
            />
          </div>
        </section>
      )}

      {view === 'preview' && originalDataUrl && originalDimensions && (
        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8">
            <SectionLabel>{t('preview.label')}</SectionLabel>

            <img
              src={previewUrl ?? originalDataUrl}
              alt="Preview"
              className="max-h-[60vh] border border-border"
            />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <ScaleSelector />
              <button
                onClick={() => void runUpscale()}
                className="bg-accent px-8 py-3 font-display text-sm font-bold tracking-wide text-bg transition-transform hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,255,71,0.25)]"
              >
                {t('preview.upscale')}
              </button>
              <button
                onClick={() => setStage('cropping')}
                className="border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted hover:border-muted hover:text-text"
              >
                {t('preview.crop')}
              </button>
              <button
                onClick={reset}
                className="border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted hover:border-muted hover:text-text"
              >
                {t('preview.reset')}
              </button>
            </div>

            {previewDims && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {originalDimensions.width}×{originalDimensions.height} →{' '}
                <span className="text-text">
                  {previewDims.width}×{previewDims.height}
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      {view === 'done' && resultUrl && resultDimensions && inputDims && (
        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8">
            <SectionLabel>{t('done.label')}</SectionLabel>

            <BeforeAfterSlider
              beforeSrc={previewUrl ?? originalDataUrl ?? ''}
              afterSrc={resultUrl}
            />

            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {Math.round(inputDims.width)}×{Math.round(inputDims.height)} →{' '}
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
                {t('done.processNew')}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
