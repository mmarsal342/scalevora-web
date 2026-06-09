import { useCallback, useEffect, useRef, useState } from 'react'

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  alt?: string
}

/**
 * Pure CSS reveal slider with mouse + touch + keyboard.
 * Right side ("after") sits beneath the left "before" via overflow clip;
 * drag the handle to move the reveal line.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  alt = 'Before / after',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const [dragging, setDragging] = useState(false)

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, pct)))
  }, [])

  useEffect(() => {
    if (!dragging) return

    function onMove(e: MouseEvent | TouchEvent) {
      const x = 'touches' in e ? e.touches[0]?.clientX : e.clientX
      if (typeof x === 'number') updateFromClientX(x)
    }
    function onUp() {
      setDragging(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging, updateFromClientX])

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 2))
    if (e.key === 'ArrowRight') setPosition((p) => Math.min(100, p + 2))
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        setDragging(true)
        updateFromClientX(e.clientX)
      }}
      onTouchStart={(e) => {
        setDragging(true)
        const t = e.touches[0]
        if (t) updateFromClientX(t.clientX)
      }}
      role="slider"
      aria-label="Before / after compare"
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={onKey}
      className="relative w-full max-w-3xl select-none overflow-hidden border border-border outline-none focus:border-accent"
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      {/* AFTER full layer */}
      <img
        src={afterSrc}
        alt={alt}
        draggable={false}
        className="block w-full"
      />

      {/* BEFORE clipped layer */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeSrc}
          alt=""
          draggable={false}
          className="block h-full max-w-none"
          style={{
            width: containerRef.current?.clientWidth ?? '100%',
          }}
        />
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute left-3 top-3 bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-text backdrop-blur-sm">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-accent backdrop-blur-sm">
        After
      </span>

      {/* Handle line */}
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-accent"
        style={{ left: `${position}%` }}
      />

      {/* Handle grip */}
      <div
        className="absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent bg-bg shadow-[0_0_24px_rgba(232,255,71,0.35)]"
        style={{ left: `${position}%` }}
      >
        <span className="font-mono text-xs text-accent">‹ ›</span>
      </div>
    </div>
  )
}
