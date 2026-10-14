import { cn } from '@/lib/utils'
import { TONE_CLASS, type Tone } from '@/lib/tone'

/** A state named in its tone's colours, with a dot: a Stripe account's, a plan's, an invoice's. */
export function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap',
        TONE_CLASS[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  )
}
