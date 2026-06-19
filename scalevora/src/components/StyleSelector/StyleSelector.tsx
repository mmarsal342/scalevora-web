import { useLocale } from '@/hooks/useLocale'
import type { ArtStyle } from '@/types'

interface StyleSelectorProps {
  value: ArtStyle
  onChange: (val: ArtStyle) => void
  disabled?: boolean
  className?: string
}

export function StyleSelector({ value, onChange, disabled, className }: StyleSelectorProps) {
  const { t } = useLocale()

  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-surface bg-background p-1 ${className ?? ''}`}
    >
      {(['photo', 'anime'] as const).map((s) => (
        <button
          key={s}
          disabled={disabled}
          onClick={() => onChange(s)}
          className={`px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider transition-colors rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed ${
            value === s
              ? 'bg-surface text-text'
              : 'text-muted hover:text-text disabled:opacity-50'
          }`}
        >
          {s === 'photo' ? `📷 ${t('style.photo')}` : `🎨 ${t('style.anime')}`}
        </button>
      ))}
    </div>
  )
}
