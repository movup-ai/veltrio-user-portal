import { useEffect } from 'react'
import { useUIStore } from '@/state/ui.store'

function resolveIsDark(theme: 'light' | 'dark' | 'system'): boolean {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return theme === 'dark'
}

/** Applies the active theme to <html> and keeps it in sync with OS changes when in "system" mode. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    const apply = () => root.classList.toggle('dark', resolveIsDark(theme))
    apply()

    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  return children
}
