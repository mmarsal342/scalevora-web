import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useBatchStore } from '@/store/batchStore'
import { useLocale } from '@/hooks/useLocale'
import { useUpscaler } from '@/hooks/useUpscaler'
import { UploadZone } from '@/components/UploadZone/UploadZone'
import { ScaleSelector } from '@/components/ScaleSelector/ScaleSelector'
import { ProcessingOverlay } from '@/components/ProcessingOverlay/ProcessingOverlay'
import { SaveButton } from '@/components/SaveButton/SaveButton'
import { CropTool } from '@/components/CropTool/CropTool'
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider/BeforeAfterSlider'
import { BatchQueue } from '@/components/BatchQueue/BatchQueue'
import { BatchUploadZone } from '@/components/BatchUploadZone/BatchUploadZone'
import { computeOutputDimensions } from '@/utils/imageUtils'

type ViewState = 'empty' | 'cropping' | 'preview' | 'done' | 'batch'

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
  const clearBatch = useBatchStore((s) => s.clearAll)

  const originalFile = useAppStore((s) => s.originalFile)
  const originalDataUrl = useAppStore((s) => s.originalDataUrl)
  const originalDimensions = useAppStore((s) => s.originalDimensions)
  const croppedBlob = useAppStore((s) => s.croppedBlob)
  const croppedDimensions = useAppStore((s) => s.croppedDimensions)
  const resultDimensions = useAppStore((s) => s.resultDimensions)
  const resultBlob = useAppStore((s) => s.resultBlob)
  const scale = useAppStore((s) => s.scaleFactor)

  const [stage, setStage] = useState<'cropping' | 'preview'>('cropping')
  const [batchActive, setBatchActive] = useState(false)

  // Reset local stage when a new image is loaded
  useEffect(() => {
    if (originalFile) {
      setStage('cropping')
      setBatchActive(false)
    }
  }, [originalFile])

  const view: ViewState = useMemo(() => {
    if (batchActive) return 'batch'
    if (resultBlob) return 'done'
    if (!originalFile) return 'empty'
    return stage
  }, [batchActive, resultBlob, originalFile, stage])

  // Cropped preview URL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!croppedBlob) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(croppedBlob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [croppedBlob])

  // Result preview URL
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!resultBlob) { setResultUrl(null); return }
    const url = URL.createObjectURL(resultBlob)
    setResultUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [resultBlob])

  const inputDims = useMemo(
    () => croppedDimensions ?? originalDimensions,
    [croppedDimensions, originalDimensions],
  )

  const previewDims = useMemo(
    () => (inputDims ? computeOutputDimensions(inputDims, scale) : null),
    [inputDims, scale],
  )

  function handleClearBatch() {
    clearBatch()
    setBatchActive(false)
  }

  return (
    <div className="relative">
      <ProcessingOverlay />

      {/* ── EMPTY / LANDING ── */}
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
              <UploadZone onBatchMode={() => setBatchActive(true)} />
            </div>

            <div className="fade-up fade-up-d3 mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-muted">
              <span>✓ {t('home.trust.noUpload')}</span>
              <span>✓ {t('home.trust.noSignup')}</span>
              <span>✓ {t('home.trust.offline')}</span>
            </div>
          </div>
        </section>
      )}

      {/* ── BATCH MODE ── */}
      {view === 'batch' && (
        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-8">
            <SectionLabel>{t('batch.label')}</SectionLabel>

            {useBatchStore.getState().items.length === 0 ? (
              // No files yet — show batch upload zone
              <>
                <BatchUploadZone onFilesAdded={() => {}} />
                <button
                  onClick={handleClearBatch}
                  className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-text"
                >
                  ← {t('batch.backToSingle')}
                </button>
              </>
            ) : (
              <BatchQueue onClearAll={handleClearBatch} />
            )}
          </div>
        </section>
      )}

      {/* ── CROP ── */}
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

      {/* ── PREVIEW ── */}
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

            {previewDims && inputDims && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {inputDims.width}×{inputDims.height} →{' '}
                <span className="text-text">
                  {previewDims.width}×{previewDims.height}
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── DONE ── */}
      {view === 'done' && resultUrl && resultDimensions && inputDims && (
        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8">
            <SectionLabel>{t('done.label')}</SectionLabel>

            <BeforeAfterSlider
              beforeSrc={previewUrl ?? originalDataUrl ?? ''}
              afterSrc={resultUrl}
            />

            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {inputDims.width}×{inputDims.height} →{' '}
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
