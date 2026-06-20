import { useCallback, useEffect, useRef, useState } from 'react'

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  alt?: string
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  alt = 'Before / after',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Slider state
  const [position, setPosition] = useState(50)
  const [draggingSlider, setDraggingSlider] = useState(false)
  
  // Pan & Zoom state
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const lastPanRef = useRef({ x: 0, y: 0 })

  // Slider dragging logic
  const updateSliderFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // Find the relative position within the bounding box
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, pct)))
  }, [])

  // Global mouse/touch events for Slider Dragging and Panning
  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (draggingSlider) {
        const x = 'touches' in e ? e.touches[0]?.clientX : e.clientX
        if (typeof x === 'number') updateSliderFromClientX(x)
      } else if (panning) {
        const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY
        if (typeof clientX === 'number' && typeof clientY === 'number') {
          const dx = clientX - lastPanRef.current.x
          const dy = clientY - lastPanRef.current.y
          setPan(p => ({ x: p.x + dx, y: p.y + dy }))
          lastPanRef.current = { x: clientX, y: clientY }
        }
      }
    }
    
    function onUp() {
      setDraggingSlider(false)
      setPanning(false)
    }

    if (draggingSlider || panning) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      window.addEventListener('touchmove', onMove, { passive: true })
      window.addEventListener('touchend', onUp)
    }

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [draggingSlider, panning, updateSliderFromClientX])

  // Wheel to Zoom
  function handleWheel(e: React.WheelEvent) {
    // Only intercept wheel if we are zooming or it's a vertical scroll (ctrlKey usually means pinch-zoom on trackpad)
    if (e.deltaY !== 0) {
      e.preventDefault()
      
      const el = containerRef.current
      if (!el) return
      
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Calculate new scale
      const zoomFactor = -e.deltaY > 0 ? 1.05 : 1 / 1.05
      let newScale = scale * zoomFactor
      
      // Clamp scale
      newScale = Math.max(1, Math.min(newScale, 15))

      if (newScale === 1) {
        setPan({ x: 0, y: 0 })
        setScale(1)
        return
      }

      // Adjust pan to keep the cursor positioned over the same pixel
      const dx = (x - pan.x - rect.width / 2) * (1 - newScale / scale)
      const dy = (y - pan.y - rect.height / 2) * (1 - newScale / scale)
      
      setPan({
        x: pan.x + dx,
        y: pan.y + dy
      })
      setScale(newScale)
    }
  }

  // Keyboard navigation for slider
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 2))
    if (e.key === 'ArrowRight') setPosition((p) => Math.min(100, p + 2))
  }

  function handleResetZoom() {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  function handleZoomIn() {
    setScale(s => Math.min(15, s * 1.25))
  }

  function handleZoomOut() {
    setScale(s => {
      const n = Math.max(1, s / 1.25)
      if (n === 1) setPan({ x: 0, y: 0 })
      return n
    })
  }

  // Pointer down handlers
  function handleSliderDown(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation() // Prevent pan
    setDraggingSlider(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    updateSliderFromClientX(clientX)
  }

  function handleImageDown(e: React.MouseEvent | React.TouchEvent) {
    if (scale <= 1) return // Only pan if zoomed in
    setPanning(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    lastPanRef.current = { x: clientX, y: clientY }
  }

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Before / after compare"
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={onKey}
      onWheel={handleWheel}
      className="relative w-full max-w-3xl select-none overflow-hidden border border-border outline-none focus:border-accent group"
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      {/* Zoom / Pan Wrapper */}
      <div 
        className="relative w-full h-full origin-center transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          cursor: scale > 1 ? (panning ? 'grabbing' : 'grab') : 'default'
        }}
        onMouseDown={handleImageDown}
        onTouchStart={handleImageDown}
      >
        {/* AFTER Layer (Full) */}
        <img
          src={afterSrc}
          alt={alt}
          draggable={false}
          className="block w-full pointer-events-none"
        />

        {/* BEFORE Layer (Clipped) */}
        <img
          src={beforeSrc}
          alt=""
          draggable={false}
          className="absolute top-0 left-0 block w-full h-full pointer-events-none"
          style={{
            clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)`
          }}
        />

        {/* Handle grip line */}
        <div
          className="absolute inset-y-0 w-0.5 bg-accent shadow-[0_0_8px_rgba(0,0,0,0.5)] cursor-col-resize pointer-events-auto"
          style={{ left: `calc(${position}% - 1px)` }}
          onMouseDown={handleSliderDown}
          onTouchStart={handleSliderDown}
        />
        
        {/* Handle circle */}
        <div
          className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent bg-bg shadow-[0_0_12px_rgba(232,255,71,0.35)] cursor-col-resize hover:scale-110 transition-transform pointer-events-auto"
          style={{ left: `${position}%` }}
          onMouseDown={handleSliderDown}
          onTouchStart={handleSliderDown}
        >
          <span className="font-mono text-xs text-accent pointer-events-none">‹›</span>
        </div>
      </div>

      {/* Static Labels */}
      <span className="pointer-events-none absolute left-3 top-3 bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-text backdrop-blur-sm z-10 transition-opacity group-hover:opacity-100 opacity-50">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-accent backdrop-blur-sm z-10 transition-opacity group-hover:opacity-100 opacity-50">
        After
      </span>

      {/* Floating Zoom Controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-20">
        <div className="flex bg-surface/80 backdrop-blur-md rounded border border-border shadow-lg shadow-black/50 overflow-hidden text-muted">
          <button onClick={handleZoomIn} className="px-3 py-1.5 hover:bg-elevated hover:text-text transition-colors" title="Zoom In">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          </button>
          <div className="w-px bg-border" />
          <button onClick={handleResetZoom} className="px-3 py-1.5 hover:bg-elevated hover:text-text transition-colors font-mono text-[10px] flex items-center justify-center min-w-[3rem]" title="Reset Zoom">
            {Math.round(scale * 100)}%
          </button>
          <div className="w-px bg-border" />
          <button onClick={handleZoomOut} className="px-3 py-1.5 hover:bg-elevated hover:text-text transition-colors" title="Zoom Out">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
