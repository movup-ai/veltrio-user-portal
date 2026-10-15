import { PanelHeading } from '@/components/layout/PanelHeading'
import { Card } from '@/components/ui/card'

/** One of the Users page's cards: a heading over a list of people or invitations. */
export function TeamCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card as="section" className="overflow-hidden">
      <div className="border-border-soft border-b px-[18px] py-4">
        <PanelHeading title={title} description={description} />
      </div>
      {children}
    </Card>
  )
}

export function TeamList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-border-soft m-0 flex list-none flex-col divide-y p-0">{children}</ul>
}

export function TeamRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-[18px] py-3 text-[13px]">{children}</li>
  )
}
