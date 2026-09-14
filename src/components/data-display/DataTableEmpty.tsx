import { EmptyState } from '@/components/feedback/EmptyState'

interface DataTableEmptyProps {
  colSpan: number
  title: string
  description?: string
  action?: React.ReactNode
}

export function DataTableEmpty({ colSpan, title, description, action }: DataTableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <EmptyState title={title} description={description} action={action} className="border-0" />
      </td>
    </tr>
  )
}
