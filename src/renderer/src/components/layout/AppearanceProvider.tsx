import React, { useEffect, useSyncExternalStore } from 'react'
import { MotionConfig } from 'framer-motion'
import { useSettingsStore } from '../../store/useSettingsStore'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeToSystemTheme(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const systemPrefersDark = (): boolean => window.matchMedia(DARK_QUERY).matches

/**
 * Applies appearance settings app-wide: the theme (light / dark / system) and
 * reduced motion — the in-app flag or the OS preference — for both CSS
 * animations (`reduce-motion` class) and Framer Motion (`MotionConfig`).
 */
export function AppearanceProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { settings, fetchSettings } = useSettingsStore()
  const osDark = useSyncExternalStore(subscribeToSystemTheme, systemPrefersDark)
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && osDark)

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    root.classList.toggle('reduce-motion', settings.reducedMotion)
  }, [isDark, settings.reducedMotion])

  // 'user' still honours the OS prefers-reduced-motion setting
  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? 'always' : 'user'}>
      {children}
    </MotionConfig>
  )
}
