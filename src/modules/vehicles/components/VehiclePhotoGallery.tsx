import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Car, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import { useVehiclePhotoUpload } from '../hooks/use-photo-upload'
import { vehicleTarget } from '../api/vehicle-photo.api'
import { vehicleKeys } from '../hooks/use-vehicles'
import { photoSrcSet, photoThumbnail } from '../utils/vehicle.utils'
import { takeHandedOffPhotos } from '../utils/photo-handoff'
import type { VehiclePhoto } from '../types/vehicle.types'

/** The shots we prompt for when a vehicle has no photos — mirrors what ops actually needs on file. */
const SUGGESTED_SHOTS = ['front', 'rear', 'interior', 'odometer'] as const

const PAGE_SIZE = 4

/**
 * Read-only gallery: one large photo with prev/next, plus a thumbnail strip. Editing lives on
 * the Edit page. It does finish the wizard's handed-off uploads, so the gallery fills in here
 * rather than holding the Publish button.
 */
export function VehiclePhotoGallery({ vehicleId, photos }: { vehicleId: string; photos: VehiclePhoto[] }) {
  const { t } = useTranslation('vehicles')
  const queryClient = useQueryClient()
  const [activeIndex, setActiveIndex] = useState(0)
  const [api, setApi] = useState<CarouselApi>()
  const [page, setPage] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  // Only used to finish the wizard's handed-off uploads; the per-file progress UI lives on Edit.
  const { start, clearFinished } = useVehiclePhotoUpload(vehicleTarget(vehicleId))

  const active = photos[Math.min(activeIndex, Math.max(photos.length - 1, 0))]

  // `takeHandedOffPhotos` clears as it reads, so a re-render cannot re-upload.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const handedOff = takeHandedOffPhotos(vehicleId)
    if (handedOff.length === 0) return

    void start(handedOff, photos.length).then(async (result) => {
      if (result.uploaded > 0) {
        await queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(vehicleId) })
        clearFinished()
        toast({ title: t('photos.uploadSummary', { count: result.uploaded }), variant: 'success' })
      }
      if (result.failed > 0) toast({ title: t('photos.uploadFailed'), variant: 'error' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mounted vehicle
  }, [vehicleId])

  useEffect(() => {
    if (!api) return
    const sync = () => {
      setPageCount(api.scrollSnapList().length)
      setPage(api.selectedScrollSnap())
    }
    sync()
    api.on('select', sync)
    api.on('reInit', sync)
    return () => {
      api.off('select', sync)
      api.off('reInit', sync)
    }
  }, [api])

  /**
   * Follows the active photo with the thumbnail strip, so stepping past the end of a page
   * scrolls it into view instead of leaving the highlight off-screen.
   *
   * The snap is looked up in Embla's registry rather than computed: `containScroll: 'trimSnaps'`
   * drops the partial snap at the end, so the last page starts mid-group and `index / PAGE_SIZE`
   * would point past the last snap.
   */
  useEffect(() => {
    if (!api) return
    const snap = api
      .internalEngine()
      .slideRegistry.findIndex((slides) => slides.includes(activeIndex))
    if (snap !== -1 && snap !== api.selectedScrollSnap()) api.scrollTo(snap)
  }, [api, activeIndex])

  /** Wraps, so the arrows are never dead ends on a short set. */
  const step = (delta: number) => {
    if (photos.length === 0) return
    setActiveIndex((i) => (i + delta + photos.length) % photos.length)
  }

  return (
    <Card className="overflow-hidden">
      <div className="group bg-surface-2 relative flex aspect-[16/9] items-center justify-center">
        {active?.url ? (
          <img
            src={active.url}
            srcSet={photoSrcSet(active)}
            sizes="(max-width: 1024px) 100vw, 640px"
            width={active.width}
            height={active.height}
            alt={active.name}
            className="size-full object-cover"
          />
        ) : (
          // Not yet rendered by the worker.
          active ? (
            <LoadingState label={t('gallery.processing')} hideLabel className="py-0" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Car className="text-fg-4 size-8" aria-hidden />
              <p className="text-fg-3 text-[12.5px] font-semibold">{t('gallery.primaryPhoto')}</p>
            </div>
          )
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t('gallery.previousPhoto')}
              className="bg-foreground/45 hover:bg-foreground/70 absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t('gallery.nextPhoto')}
              className="bg-foreground/45 hover:bg-foreground/70 absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="bg-foreground/55 absolute right-3 bottom-3 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">
              {activeIndex + 1} / {photos.length}
            </span>
          </>
        )}

      </div>

      {photos.length > 0 ? (
        <div className="flex flex-col gap-2 p-2.5">
          <Carousel setApi={setApi} opts={{ align: 'start', slidesToScroll: PAGE_SIZE, containScroll: 'trimSnaps' }}>
            <CarouselContent>
              {photos.map((photo, index) => (
                <CarouselItem key={photo.id} className="basis-1/4">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={t('gallery.showPhoto', { name: photo.name })}
                    aria-current={index === activeIndex}
                    className={cn(
                      'group/thumb relative aspect-[4/3] w-full overflow-hidden rounded-[7px] ring-inset transition-all',
                      index === activeIndex ? 'ring-primary ring-2' : 'ring-border hover:ring-border-strong ring-1',
                    )}
                  >
                    {photo.url ? (
                      <img
                        src={photoThumbnail(photo)}
                        alt={photo.name}
                        className={cn(
                          'pointer-events-none size-full object-cover transition-opacity',
                          index === activeIndex ? 'opacity-100' : 'opacity-90 group-hover/thumb:opacity-100',
                        )}
                        draggable={false}
                      />
                    ) : (
                      <span
                        role="status"
                        aria-label={t('gallery.processing')}
                        className="bg-surface-2 text-fg-4 flex size-full items-center justify-center"
                      >
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      </span>
                    )}
                    {index === 0 && (
                      <span className="bg-foreground text-background absolute top-1 left-1 rounded-full px-1.5 py-[1px] text-[9.5px] font-semibold">
                        {t('gallery.cover')}
                      </span>
                    )}
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>

            {pageCount > 1 && (
              <>
                <CarouselPrevious className="size-7 border-0 bg-foreground/50 text-white hover:bg-foreground/70 hover:text-white disabled:opacity-0" />
                <CarouselNext className="size-7 border-0 bg-foreground/50 text-white hover:bg-foreground/70 hover:text-white disabled:opacity-0" />
              </>
            )}
          </Carousel>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => api?.scrollTo(i)}
                  aria-label={t('gallery.goToPage', { page: i + 1 })}
                  aria-current={i === page}
                  className={cn('h-1.5 rounded-full transition-all', i === page ? 'bg-primary w-4' : 'bg-border-strong w-1.5')}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5 p-2.5">
          {SUGGESTED_SHOTS.map((shot) => (
            <div
              key={shot}
              className="border-border-strong text-fg-4 flex aspect-[4/3] items-center justify-center rounded-[7px] border border-dashed text-[11.5px]"
            >
              {t(`gallery.suggestedShots.${shot}`)}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
