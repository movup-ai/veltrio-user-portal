import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  /** Rendered left of the title block — e.g. a cover image or avatar on a details page. */
  leading?: React.ReactNode
  /** Rendered inline next to the title — e.g. a status badge. */
  badge?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, leading, badge, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end gap-4', className)}>
      <div className="flex min-w-0 flex-[1_1_300px] items-center gap-3.5">
        {leading}
        <div className="min-w-0">
          <h1 className="text-heading m-0 flex flex-wrap items-center gap-2.5">
            {title}
            {badge}
          </h1>
          {description && <p className="text-fg-3 text-body-sm m-0 mt-[5px]" style={{ textWrap: 'pretty' }}>{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
