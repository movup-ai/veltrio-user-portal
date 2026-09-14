import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end gap-4', className)}>
      <div className="min-w-0 flex-[1_1_300px]">
        <h1 className="text-heading m-0">{title}</h1>
        {description && <p className="text-fg-3 text-body-sm m-0 mt-[5px]" style={{ textWrap: 'pretty' }}>{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
