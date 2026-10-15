import { cn } from '@/lib/utils'

/** The title over an onboarding step, centred as Clerk's own sign-up heading is. */
export function StepHeading({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <header className={cn('flex flex-col items-center gap-1.5 text-center', className)}>
      <h1 className="m-0 font-[family-name:var(--font-display)] text-[26px] leading-tight font-bold tracking-tight">
        {title}
      </h1>
      {children && <p className="text-description m-0 max-w-md text-balance">{children}</p>}
    </header>
  )
}
