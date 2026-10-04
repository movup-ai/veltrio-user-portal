export type BrandAsset = 'logo' | 'banner'

/** How the company's booking site looks. */
export interface Brand {
  primaryColor: string
  backgroundColor: string
  textColor: string
  /** The banner's heading; the site falls back to the company name. */
  headline?: string
  logoUrl?: string
  bannerUrl?: string
}

/** The colour and headline form; images upload on their own, the moment they are picked. */
export interface BrandValues {
  primaryColor: string
  backgroundColor: string
  textColor: string
  headline: string
}
