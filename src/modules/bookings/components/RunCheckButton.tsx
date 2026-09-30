import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface RunCheckButtonProps {
  label: string
  variant: 'primary' | 'outline'
  loading?: boolean
  onClick: () => void
  blockedReason?: string
}

/**
 * The run button, disabled with a tooltip while the renter is still being typed in.
 *
 * The span around it is what makes the tooltip work: a disabled button has
 * `pointer-events: none`, so it never fires the hover the tooltip opens on.
 */
export function RunCheckButton({
  label,
  variant,
  loading,
  onClick,
  blockedReason,
}: RunCheckButtonProps) {
  const button = (
    <Button
      type="button"
      size="sm"
      variant={variant}
      loading={loading}
      disabled={Boolean(blockedReason)}
      onClick={onClick}
    >
      {label}
    </Button>
  )

  if (!blockedReason) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px]">{blockedReason}</TooltipContent>
    </Tooltip>
  )
}
