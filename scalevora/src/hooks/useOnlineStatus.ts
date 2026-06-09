import { useEffect, useState } from 'react'

/**
 * Tracks navigator.onLine. The model + chunks are precached by the SW,
 * so the app keeps working offline once the first visit completes.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    function on() {
      setOnline(true)
    }
    function off() {
      setOnline(false)
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}
