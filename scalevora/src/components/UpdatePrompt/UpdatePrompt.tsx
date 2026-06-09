import { useEffect, useState } from 'react'
import { setupServiceWorker } from '@/lib/sw-register'

/**
 * Toast shown when a fresh build is waiting in the SW. Clicking reload
 * activates the new SW + reloads the page.
 */
export function UpdatePrompt() {
  const [available, setAvailable] = useState(false)
  const [reload, setReload] = useState<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (import.meta.env.DEV) return
    const trigger = setupServiceWorker(() => setAvailable(true))
    setReload(() => trigger)
  }, [])

  if (!available) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 border border-accent bg-surface px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <span className="font-mono text-[11px] uppercase tracking-wider text-text">
        New version available
      </span>
      <button
        onClick={() => reload?.()}
        className="bg-accent px-3 py-1 font-display text-xs font-bold text-bg"
      >
        Reload
      </button>
      <button
        onClick={() => setAvailable(false)}
        className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-text"
      >
        Later
      </button>
    </div>
  )
}
