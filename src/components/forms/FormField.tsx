import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  className?: string
  children: (props: { id: string; 'aria-describedby'?: string; invalid: boolean }) => React.ReactNode
}

/**
 * Composes label + control + help text + error message with consistent
 * spacing and a11y wiring. Pass the input as a render prop so this stays
 * control-agnostic (Input, Select, Textarea, ...).
 */
export function FormField({ label, description, error, required, className, children }: FormFieldProps) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-error" aria-hidden>
            {' '}
            *
          </span>
        )}
      </Label>
      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}
      {description && !error && (
        <p id={descriptionId} className="text-description">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-caption text-error">
          {error}
        </p>
      )}
    </div>
  )
}
