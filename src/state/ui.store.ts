import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'veltrio.theme'
const SIDEBAR_KEY = 'veltrio.sidebar_collapsed'

interface UIState {
  theme: Theme
  setTheme: (theme: Theme) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
}

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

export const useUIStore = create<UIState>((set) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    set({ theme })
  },

  sidebarCollapsed: localStorage.getItem(SIDEBAR_KEY) === 'true',
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return { sidebarCollapsed: next }
    }),
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed))
    set({ sidebarCollapsed: collapsed })
  },

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}))
