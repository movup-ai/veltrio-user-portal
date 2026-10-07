import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { conditionPhotoApi } from '../api/booking-condition-photo.api'
import { MAX_CONDITION_PHOTOS_PER_STAGE } from '../constants/booking.constants'
import type { ConditionPhotoDraft } from '../types/booking.types'
import { screenConditionPhotos } from '../utils/booking.condition'

export const conditionPhotoKeys = {
  // Not under `bookingKeys.all`: every refetch of that would reload each image on a new link.
  booking: (reference: string) => ['booking-condition-photos', reference] as const,
}

/** Half the hour the API's image links last, so one on screen is never an expired one. */
const PHOTO_LINKS_FRESH_MS = 30 * 60_000

/** The photos of recorded handovers. `enabled` is off until one is, when there are none to ask for. */
export function useConditionPhotos(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: conditionPhotoKeys.booking(reference),
    queryFn: () => conditionPhotoApi.list(reference),
    staleTime: PHOTO_LINKS_FRESH_MS,
    // Going stale re-reads nothing on an open page. The timer does, and focus covers a tab
    // that sat in the background, where the timer does not run.
    refetchInterval: PHOTO_LINKS_FRESH_MS,
    refetchOnWindowFocus: true,
    enabled,
  })
}

/**
 * A handover form's photos, held in the browser. Nothing is uploaded until the handover is
 * recorded, so a cancelled form leaves nothing on the booking.
 */
export function useConditionPhotoDraft() {
  const [photos, setPhotos] = useState<ConditionPhotoDraft[]>([])
  const previews = useRef(new Set<string>())

  // The previews are the form's to release, whichever way it goes away.
  useEffect(() => {
    const created = previews.current
    return () => created.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function add(files: File[]) {
    const { accepted, rejected } = screenConditionPhotos(
      files,
      MAX_CONDITION_PHOTOS_PER_STAGE - photos.length,
    )
    if (rejected.length > 0) {
      toast({
        title: i18n.t('bookings:details.condition.photos.skipped'),
        description: rejected
          .map(({ name, reason }) =>
            i18n.t(`bookings:details.condition.photos.rejected.${reason}`, {
              name,
              max: MAX_CONDITION_PHOTOS_PER_STAGE,
            }),
          )
          .join(' · '),
        variant: 'error',
      })
    }
    const picked = accepted.map((file) => {
      const url = URL.createObjectURL(file)
      previews.current.add(url)
      return { id: crypto.randomUUID(), name: file.name, url, file }
    })
    setPhotos((current) => [...current, ...picked])
  }

  function remove(id: string) {
    const photo = photos.find((entry) => entry.id === id)
    if (!photo) return
    URL.revokeObjectURL(photo.url)
    previews.current.delete(photo.url)
    setPhotos((current) => current.filter((entry) => entry.id !== id))
  }

  return { photos, add, remove }
}
