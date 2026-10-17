import type { Ref } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

/**
 * An image shown full size over the page. `src` for a stored file, `imageRef` for a local one
 * (see `usePreviewRef`); `action` sits beside the name, e.g. a link to the original.
 */
export function ImagePreviewDialog({
  open,
  onOpenChange,
  name,
  src,
  imageRef,
  action,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  src?: string
  imageRef?: Ref<HTMLImageElement>
  action?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wider than the default dialog and sized to the image: a screenshot or a licence
          photographed in landscape is unreadable squeezed into a form-width box. */}
      <DialogContent className="max-w-3xl gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3 pr-8">
          <DialogTitle className="min-w-0 flex-1 truncate text-[14.5px]">{name}</DialogTitle>
          {action}
        </div>
        <img
          ref={imageRef}
          src={src}
          alt={name}
          className="max-h-[70vh] w-full rounded-[7px] object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}
