import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export const ToastProvider = ToastPrimitive.Provider

export function ToastViewport({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'pointer-events-none fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm',
        className,
      )}
      {...props}
    />
  )
}

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-md border p-4 shadow-md',
  {
    variants: {
      variant: {
        default: 'border-border bg-card text-card-foreground',
        success: 'border-success/30 bg-success/10 text-foreground',
        error: 'border-error/30 bg-error/10 text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export const Toast = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      toastVariants({ variant }),
      'data-[state=open]:animate-slide-in-right data-[swipe=end]:animate-fade-out',
      className,
    )}
    {...props}
  />
))
Toast.displayName = ToastPrimitive.Root.displayName

export const ToastAction = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      'shrink-0 rounded-md border border-input px-2.5 py-1 text-label font-medium transition-colors hover:bg-muted',
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitive.Action.displayName

export const ToastClose = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => {
  const { t } = useTranslation('common')

  return (
    <ToastPrimitive.Close
      ref={ref}
      className={cn('shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100', className)}
      aria-label={t('actions.dismiss')}
      {...props}
    >
      <X className="size-4" />
    </ToastPrimitive.Close>
  )
})
ToastClose.displayName = ToastPrimitive.Close.displayName

export const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn('text-label font-semibold', className)} {...props} />
))
ToastTitle.displayName = ToastPrimitive.Title.displayName

export const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn('text-description', className)} {...props} />
))
ToastDescription.displayName = ToastPrimitive.Description.displayName
