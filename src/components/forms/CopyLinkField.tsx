import { useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'

const COPIED_FOR_MS = 2_000

interface CopyLinkFieldProps {
  id: string
  label: string
  url: string
  copyLabel: string
  copiedLabel: string
  /** Shown when the browser refuses the clipboard; the field can still be selected by hand. */
  copyFailed: string
  /** Under the field, about the link itself. */
  help?: string
}

/** A link to hand over: read-only, selected on focus, with a button that copies it. */
export function CopyLinkField({
  id,
  label,
  url,
  copyLabel,
  copiedLabel,
  copyFailed,
  help,
}: CopyLinkFieldProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FOR_MS)
    } catch {
      // Refused outside a secure context or without permission.
      toast({ title: copyFailed, variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 className="text-fg-4 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id={id}
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            // Grey: a value to copy, not a field to type in.
            className="bg-surface-2 text-fg-2 pl-9"
          />
        </div>
        {/* A minimum width, so the button does not jump as its label changes. */}
        <Button type="button" variant="outline" onClick={() => void copy()} className="min-w-[92px] shrink-0">
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
      {help && <p className="text-description m-0">{help}</p>}
    </div>
  )
}
