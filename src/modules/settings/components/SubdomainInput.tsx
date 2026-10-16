import { forwardRef } from 'react'
import { Input, type InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SITE_DOMAIN } from '@/modules/vehicles/utils/public-links'

/**
 * The subdomain typed in front of the domain it sits under, so the whole URL reads as one. One
 * control, not an input beside a box: the border, focus ring and error state are the wrapper's,
 * since the input's own ring stopped at the suffix and cut across it.
 */
export const SubdomainInput = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <div
    className={cn(
      'border-input bg-field flex h-9 min-w-0 flex-1 overflow-hidden rounded-md border shadow-xs transition-colors',
      'focus-within:outline-ring focus-within:outline-2 focus-within:outline-offset-2',
      'has-[[aria-invalid=true]]:border-error has-[[aria-invalid=true]]:focus-within:outline-error',
      'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
      className,
    )}
  >
    <Input
      ref={ref}
      autoCapitalize="none"
      autoComplete="off"
      spellCheck={false}
      className="h-full min-w-0 rounded-none border-0 bg-transparent shadow-none focus-visible:outline-none disabled:opacity-100"
      {...props}
    />
    <span className="border-input bg-muted text-muted-foreground text-body inline-flex shrink-0 items-center border-l px-3">
      .{SITE_DOMAIN}
    </span>
  </div>
))
SubdomainInput.displayName = 'SubdomainInput'
