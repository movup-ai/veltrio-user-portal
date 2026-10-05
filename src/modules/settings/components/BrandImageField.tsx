import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { PHOTO_ACCEPT, photoContentType } from '@/modules/vehicles/utils/photo-files'
import { MAX_BRAND_IMAGE_BYTES } from '../constants/brand.constants'
import { useRemoveBrandAsset, useUploadBrandAsset } from '../hooks/use-brand'
import type { BrandAsset } from '../types/brand.types'

interface BrandImageFieldProps {
  asset: BrandAsset
  /** The saved image, if any. */
  url?: string
  /** Reports the picked file's local URL while it uploads, so the preview shows it at once. */
  onPreview: (url: string | undefined) => void
}

/** One image, uploaded the moment it is picked or dropped. Logo and banner each own a mutation. */
export function BrandImageField({ asset, url, onPreview }: BrandImageFieldProps) {
  const { t } = useTranslation('settings')
  const inputId = useId()
  const [local, setLocal] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const upload = useUploadBrandAsset()
  const remove = useRemoveBrandAsset()
  const busy = upload.isPending || remove.isPending
  const shown = local ?? url

  useEffect(() => () => {
    if (local) URL.revokeObjectURL(local)
  }, [local])

  const pick = (file: File | undefined) => {
    // One at a time: a second pick's preview would be cleared when the first upload settles, and
    // whichever upload the server finished last would be the one saved.
    if (!file || busy) return
    if (!photoContentType(file)) {
      toast({ title: t('brand.images.invalidType'), variant: 'error' })
      return
    }
    if (file.size > MAX_BRAND_IMAGE_BYTES[asset]) {
      toast({ title: t('brand.images.tooLarge', { max: MAX_BRAND_IMAGE_BYTES[asset] / (1024 * 1024) }), variant: 'error' })
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setLocal(objectUrl)
    onPreview(objectUrl)
    upload.mutate(
      { asset, file },
      {
        onSettled: () => {
          setLocal(undefined)
          onPreview(undefined)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-label">
          {t(`brand.images.${asset}`)}
        </label>
        {/* The image itself is the upload and replace target, so removing is the only action. */}
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-fg-3 hover:text-error size-7"
            disabled={busy}
            loading={remove.isPending}
            aria-label={t(`brand.images.${asset}Remove`)}
            title={t(`brand.images.${asset}Remove`)}
            onClick={() => remove.mutate(asset)}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          pick(event.dataTransfer.files[0])
        }}
        className={cn(
          'group border-border bg-surface-2 relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors',
          busy ? 'cursor-progress' : 'cursor-pointer',
          asset === 'logo' ? 'h-24' : 'aspect-[2/1]',
          dragging && 'border-primary bg-tint',
        )}
      >
        {shown ? (
          <img
            src={shown}
            alt={t(`brand.images.${asset}`)}
            className={cn('size-full', asset === 'logo' ? 'object-contain p-3' : 'object-cover')}
          />
        ) : (
          <span className="text-fg-3 flex flex-col items-center gap-1.5 text-[12.5px]">
            <ImagePlus className="size-5" aria-hidden />
            {t('brand.images.drop')}
          </span>
        )}
        {shown && !busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[12.5px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            {t('brand.images.replaceHint')}
          </span>
        )}
        {upload.isPending && (
          <span className="bg-surface/70 absolute inset-0 flex items-center justify-center gap-2 text-[12.5px]">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('brand.images.uploading')}
          </span>
        )}
      </label>
      <p className="text-fg-4 text-[11.5px]">{t(`brand.images.${asset}Help`)}</p>

      <input
        id={inputId}
        type="file"
        disabled={busy}
        accept={PHOTO_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          pick(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </div>
  )
}
