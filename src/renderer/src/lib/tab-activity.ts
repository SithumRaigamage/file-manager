import { createContext, useContext, useEffect } from 'react'

// True while the page it wraps is the visible tab. Defaults to true so a page
// rendered outside KeepAliveRoutes behaves like a normally mounted page.
export const TabActiveContext = createContext(true)

/**
 * Runs `callback` every time the enclosing page becomes the visible tab
 * (including its first mount). Use for data that should be refreshed when the
 * user comes back to a page, since kept-alive pages don't remount.
 */
export function useTabActivated(callback: () => void): void {
  const isActive = useContext(TabActiveContext)
  useEffect(() => {
    if (isActive) callback()
  }, [isActive, callback])
}
