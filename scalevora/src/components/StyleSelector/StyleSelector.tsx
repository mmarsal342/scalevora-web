import { useState, useRef, useEffect } from 'react'
import { useLocale } from '@/hooks/useLocale'
import type { ArtStyle, PhotoQuality } from '@/types'

interface StyleSelectorProps {
  value: ArtStyle
  onChange: (val: ArtStyle) => void
  photoQuality?: PhotoQuality
  onQualityChange?: (val: PhotoQuality) => void
  disabled?: boolean
  className?: string
}

export function StyleSelector({
  value,
  onChange,
  photoQuality = 'fast',
  onQualityChange,
  disabled,
  className,
}: StyleSelectorProps) {
  const { t } = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function handlePhotoClick() {
    if (disabled) return
    if (value === 'photo') {
      // Toggle dropdown if already selected
      setIsOpen((prev) => !prev)
    } else {
      onChange('photo')
      // Don't auto-open dropdown, let them click again if they want to change quality
      setIsOpen(false)
    }
  }

  function handleAnimeClick() {
    if (disabled) return
    onChange('anime')
    setIsOpen(false)
  }

  return (
    <div className={`relative flex items-center ${className ?? ''}`} ref={dropdownRef}>
      <div className="flex items-center gap-1 rounded-full border border-surface bg-background p-1">
        {/* Photo Button */}
        <button
          disabled={disabled}
          onClick={handlePhotoClick}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider transition-colors rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed ${
            value === 'photo'
              ? 'bg-surface text-text'
              : 'text-muted hover:text-text disabled:opacity-50'
          }`}
        >
          <span>📷 {t('style.photo')}</span>
          {value === 'photo' && onQualityChange && (
            <svg
              className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {/* Anime Button */}
        <button
          disabled={disabled}
          onClick={handleAnimeClick}
          className={`px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider transition-colors rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed ${
            value === 'anime'
              ? 'bg-surface text-text'
              : 'text-muted hover:text-text disabled:opacity-50'
          }`}
        >
          🎨 {t('style.anime')}
        </button>
      </div>

      {/* Quality Dropdown */}
      {isOpen && value === 'photo' && onQualityChange && !disabled && (
        <div className="absolute top-full left-0 mt-2 w-48 z-50 rounded-md border border-border bg-surface p-1 shadow-lg shadow-black/50 ring-1 ring-black/5">
          <button
            onClick={() => {
              onQualityChange('fast')
              setIsOpen(false)
            }}
            className={`flex w-full flex-col items-start gap-0.5 rounded px-3 py-2 text-left transition-colors hover:bg-elevated ${
              photoQuality === 'fast' ? 'bg-elevated' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={photoQuality === 'fast' ? 'text-accent' : 'text-text'}>⚡ Fast</span>
              {photoQuality === 'fast' && <span className="text-accent">✓</span>}
            </div>
            <span className="font-mono text-[10px] text-muted">~879KB · Quick results</span>
          </button>

          <button
            onClick={() => {
              onQualityChange('quality')
              setIsOpen(false)
            }}
            className={`flex w-full flex-col items-start gap-0.5 rounded px-3 py-2 text-left transition-colors hover:bg-elevated ${
              photoQuality === 'quality' ? 'bg-elevated' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={photoQuality === 'quality' ? 'text-accent' : 'text-text'}>✦ Quality</span>
              {photoQuality === 'quality' && <span className="text-accent">✓</span>}
            </div>
            <span className="font-mono text-[10px] text-muted">~2.7MB · Better detail, slower</span>
          </button>
        </div>
      )}
    </div>
  )
}
