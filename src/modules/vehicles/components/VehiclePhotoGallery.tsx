import { useEffect, useState } from 'react'
import { Car } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel'
import { cn } from '@/lib/utils'
import type { VehiclePhoto } from '../types/vehicle.types'

/** The shots we prompt for when a vehicle has no photos — mirrors what ops actually needs on file. */
const SUGGESTED_SHOTS = ['front', 'rear', 'interior', 'odometer'] as const

const PAGE_SIZE = 4

export function VehiclePhotoGallery({ photos }: { photos: VehiclePhoto[] }) {
  const { t } = useTranslation('vehicles')
  const [activeIndex, setActiveIndex] = useState(0)
  const [api, setApi] = useState<CarouselApi>()
  const [page, setPage] = useState(0)
  const [pageCount, setPageCount] = useState(0)

  const active = photos[Math.min(activeIndex, photos.length - 1)]

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

  return (
    <Card className="overflow-hidden">
      <div className="bg-surface-2 flex aspect-[16/9] items-center justify-center">
        {active ? (
          <img src={active.url} alt={active.name} className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Car className="text-fg-4 size-8" aria-hidden />
            <p className="text-fg-3 text-[12.5px] font-semibold">{t('gallery.primaryPhoto')}</p>
          </div>
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
                      'group relative aspect-[4/3] w-full overflow-hidden rounded-[7px] ring-inset transition-all',
                      index === activeIndex ? 'ring-primary ring-2' : 'ring-border hover:ring-border-strong ring-1',
                    )}
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className={cn(
                        'pointer-events-none size-full object-cover transition-opacity',
                        index === activeIndex ? 'opacity-100' : 'opacity-90 group-hover:opacity-100',
                      )}
                      draggable={false}
                    />
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
