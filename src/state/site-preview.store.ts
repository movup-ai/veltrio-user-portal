import { create } from 'zustand'

interface SitePreviewState {
  /** The Company URL as typed on the company step; empty when nothing is typed or the step is gone. */
  subdomain: string
  setSubdomain: (subdomain: string) => void
}

/** Carries the URL from the onboarding form to the brand panel beside it, which previews it as typed. */
export const useSitePreviewStore = create<SitePreviewState>((set) => ({
  subdomain: '',
  setSubdomain: (subdomain) => set({ subdomain }),
}))
