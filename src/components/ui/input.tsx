import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-body shadow-xs transition-colors',
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
Input.displayName = 'Input'
