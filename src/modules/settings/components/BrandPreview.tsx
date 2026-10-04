import { Car, Mail, MapPin, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { siteUrl } from '@/modules/vehicles/utils/public-links'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import {
  formatRateOptionPrice,
  headlineRateOption,
  photoThumbnail,
  vehicleDisplayName,
} from '@/modules/vehicles/utils/vehicle.utils'
import { SOCIAL_FIELDS, type Company } from '../types/company.types'
import { readableOn } from '../utils/brand.utils'

export interface BrandPreviewProps {
  primaryColor: string
  backgroundColor: string
  textColor: string
  headline?: string
  logoUrl?: string
  bannerUrl?: string
  company: Company
  vehicles: Vehicle[]
}

const SAMPLE_CARDS = 3

/** The booking site in miniature, redrawn from the form as it is edited. */
export function BrandPreview(props: BrandPreviewProps) {
  const { t } = useTranslation('settings')
  const { primaryColor, backgroundColor, textColor, logoUrl, bannerUrl, company, vehicles } = props
  const onPrimary = readableOn(primaryColor)
  const rule = `color-mix(in srgb, ${textColor} 12%, transparent)`
  const muted = `color-mix(in srgb, ${textColor} 65%, transparent)`
  const socials = SOCIAL_FIELDS.filter((field) => company[field])
  const contact = [
    { icon: Mail, value: company.contactEmail },
    { icon: Phone, value: company.contactPhone },
    { icon: MapPin, value: company.address },
  ].filter((item) => item.value)

  const button = (label: string) => (
    <span
      className="rounded-md px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"
      style={{ background: primaryColor, color: onPrimary }}
    >
      {label}
    </span>
  )

  return (
    <Card as="section" aria-label={t('brand.preview.title')} className="overflow-hidden">
      <div className="border-border-soft bg-surface-2 flex items-center gap-3 border-b px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="bg-border-strong size-2.5 rounded-full" />
          ))}
        </span>
        <span className="bg-surface text-fg-3 min-w-0 flex-1 truncate rounded-md px-3 py-1 text-[12px]">
          {new URL(siteUrl(company.subdomain)).host}
        </span>
        <span className="text-fg-4 text-[11.5px] font-semibold tracking-wide uppercase">{t('brand.preview.title')}</span>
      </div>

      {/* The site's own colours throughout, never the portal's theme. */}
      <div data-testid="brand-preview-site" style={{ background: backgroundColor, color: textColor }} className="text-[13px]">
        <header className="flex items-center justify-between gap-4 px-5 py-3" style={{ borderBottom: `1px solid ${rule}` }}>
          {logoUrl ? (
            <img src={logoUrl} alt={company.name} className="h-8 max-w-[140px] object-contain" />
          ) : (
            <span className="truncate text-[15px] font-bold">{company.name}</span>
          )}
          <nav className="hidden gap-4 text-[12px] sm:flex" style={{ color: muted }}>
            <span>{t('brand.preview.nav.vehicles')}</span>
            <span>{t('brand.preview.nav.about')}</span>
            <span>{t('brand.preview.nav.contact')}</span>
          </nav>
          {button(t('brand.preview.book'))}
        </header>

        <div
          className="flex min-h-[210px] flex-col justify-end gap-2 bg-cover bg-center p-5"
          style={
            bannerUrl
              ? {
                  // A dark wash so white text reads on any photo.
                  backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.1)), url("${bannerUrl}")`,
                  color: '#FFFFFF',
                }
              : { background: primaryColor, color: onPrimary }
          }
        >
          <h3 className="max-w-[460px] text-[22px] leading-tight font-bold">{props.headline || company.name}</h3>
          {company.description && <p className="line-clamp-2 max-w-[460px] text-[13px] opacity-90">{company.description}</p>}
        </div>

        <div className="px-5 py-5">
          <h4 className="mb-3 text-[14px] font-semibold">{t('brand.preview.fleet')}</h4>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {(vehicles.length ? vehicles.slice(0, SAMPLE_CARDS) : Array.from({ length: SAMPLE_CARDS }, () => undefined)).map(
              (vehicle, index) => {
                const photo = vehicle?.photos[0]
                const rate = vehicle && headlineRateOption(vehicle)
                return (
                  <div key={vehicle?.id ?? index} className="overflow-hidden rounded-lg" style={{ border: `1px solid ${rule}` }}>
                    <div
                      className="flex aspect-[4/3] items-center justify-center"
                      style={{ background: `color-mix(in srgb, ${primaryColor} 10%, ${backgroundColor})` }}
                    >
                      {photo ? (
                        <img src={photoThumbnail(photo)} alt="" className="size-full object-cover" />
                      ) : (
                        <Car className="size-6" style={{ color: primaryColor }} aria-hidden />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 p-2.5">
                      <span className="truncate font-semibold">
                        {vehicle ? vehicleDisplayName(vehicle) : t('brand.preview.sampleVehicle')}
                      </span>
                      <span className="text-[12px] font-semibold" style={{ color: primaryColor }}>
                        {rate ? t('brand.preview.from', { price: formatRateOptionPrice(rate) }) : t('brand.preview.noRate')}
                      </span>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        </div>

        <footer className="flex flex-wrap justify-between gap-4 px-5 py-4 text-[12px]" style={{ borderTop: `1px solid ${rule}`, color: muted }}>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-semibold" style={{ color: textColor }}>
              {company.name}
            </span>
            {contact.map(({ icon: Icon, value }) => (
              <span key={value} className="flex items-center gap-1.5 truncate">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {value}
              </span>
            ))}
          </div>
          {socials.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="font-semibold" style={{ color: textColor }}>
                {t('brand.preview.follow')}
              </span>
              <span>{socials.map((field) => t(`company.social.${field}`)).join(' · ')}</span>
            </div>
          )}
        </footer>
      </div>
    </Card>
  )
}
