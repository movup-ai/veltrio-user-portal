import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-body shadow-xs transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:outline-error',
          className,
        )}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'
