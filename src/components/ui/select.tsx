import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Select({
  onValueChange,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return (
    <SelectPrimitive.Root
      {...props}
      onValueChange={onValueChange && ((value) => value && onValueChange(value))}
    />
  )
}
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-body shadow-xs transition-colors',
        'data-[placeholder]:text-muted-foreground focus:outline-ring focus:outline-2 focus:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-error aria-[invalid=true]:focus:outline-error',
        '[&>span]:line-clamp-1',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  sideOffset = 4,
  onCloseAutoFocus,
  onPointerDownOutside,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  const dismissedByPointer = React.useRef(false)
  // Captured while open: Radix clears `aria-controls` before focus returns to the trigger.
  const trigger = React.useRef<HTMLElement | null>(null)

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={sideOffset}
        ref={(node) => {
          if (node?.id) {
            trigger.current = document.querySelector<HTMLElement>(`[aria-controls="${node.id}"]`)
          }
        }}
        onPointerDownOutside={(event) => {
          dismissedByPointer.current = true
          onPointerDownOutside?.(event)
        }}
        onPointerDown={() => {
          dismissedByPointer.current = true
        }}
        onKeyDown={() => {
          dismissedByPointer.current = false
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          const byPointer = dismissedByPointer.current
          dismissedByPointer.current = false
          if (event.defaultPrevented || !byPointer) return

          // Focus must still return to the trigger; only the ring is suppressed, and only for
          // this one restore — see the [data-silent-focus] rule in globals.css.
          const element = trigger.current
          if (!element) return
          element.dataset.silentFocus = ''
          const clear = () => {
            delete element.dataset.silentFocus
            element.removeEventListener('blur', clear)
            element.removeEventListener('keydown', clear)
          }
          element.addEventListener('blur', clear)
          element.addEventListener('keydown', clear)
        }}
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
          // Grow from the trigger edge rather than the panel centre.
          'origin-[var(--radix-select-content-transform-origin)]',
          'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
          position === 'popper' && 'w-[var(--radix-select-trigger-width)]',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1">
          <ChevronUp className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1">
          <ChevronDown className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body outline-none transition-colors',
        'focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export function SelectSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}
