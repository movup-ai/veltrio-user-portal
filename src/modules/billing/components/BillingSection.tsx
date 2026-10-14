import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'

interface BillingSectionProps {
  icon: LucideIcon
  /** What the section is, beside its icon. */
  section: string
  sectionHelp: string
  title: string
  description: string
  children: React.ReactNode
}

/** One section of the Billing tab: what it is on the left, its content on the right. */
export function BillingSection({
  icon: Icon,
  section,
  sectionHelp,
  title,
  description,
  children,
}: BillingSectionProps) {
  return (
    <Card as="section" className="grid overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="border-border-soft flex flex-col gap-3 border-b p-6 lg:border-r lg:border-b-0">
        <span className="bg-surface-3 text-fg-2 flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" aria-hidden />
        </span>
        <PanelHeading title={section} description={sectionHelp} />
      </div>

      <div className="flex min-w-0 flex-col gap-4 p-6">
        <PanelHeading title={title} description={description} />
        {children}
      </div>
    </Card>
  )
}
