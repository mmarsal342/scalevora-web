import { registerSW } from 'virtual:pwa-register'

/**
 * Service worker registration. Returns a callback the UI can wire to a
 * "New version available — reload" toast. The SW is only active in
 * production builds (devOptions.enabled = false in vite.config.ts).
 */
export function setupServiceWorker(onUpdate: () => void): () => Promise<void> {
  const updateSW = registerSW({
    onNeedRefresh() {
      onUpdate()
    },
    onOfflineReady() {
      // First-visit cache complete. No prompt — the app already works
      // without it, the next visit will just be instant.
    },
  })
  return () => updateSW(true)
}
