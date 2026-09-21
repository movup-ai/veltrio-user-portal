import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreVertical, Plus, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/i18n'
import { parseDay } from '@/utils/dates'
import { translateDomain } from '@/i18n/domain'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { PanelHeading } from '@/components/layout/PanelHeading'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteServiceRecord, useServiceRecords } from '../hooks/use-service-records'
import type { ServiceDue, ServiceRecord } from '../types/service-record.types'
import { ServiceRecordDialog } from './ServiceRecordDialog'

interface Props {
  vehicleId: string
}

const DUE_TONE = {
  overdue: 'bg-error',
  due_soon: 'bg-warning',
  scheduled: 'bg-fg-4',
} as const satisfies Record<ServiceDue['state'], string>

/**
 * One row of the timeline: a dot on the rail, title and meta on the left, date and money on
 * the right. Upcoming and past entries share it so the column edges line up down the card.
 */
function TimelineRow({
  dotClass,
  title,
  meta,
  note,
  date,
  amount,
  emphasis,
  actions,
}: {
  dotClass: string
  title: string
  meta?: string
  note?: string
  date: string
  amount: string
  emphasis?: boolean
  actions?: React.ReactNode
}) {
  return (
    <li className="relative py-3 pl-5 first:[--dot-top:6px] last:[--dot-top:18px]">
      <span
        className={cn(
          'absolute left-0 top-[var(--dot-top,18px)] size-[7px] shrink-0 rounded-full',
          // Sits on the rail, so it needs a ring in the card colour to break the line.
          'ring-card ring-4',
          dotClass,
        )}
      />
      {/* Title and date share a line; the amount follows the meta. Narrow columns would
          otherwise wrap the title mid-phrase to make room for the date beside it. */}
      <div className="flex items-baseline justify-between gap-2">
        <p className={cn('m-0 text-[13.5px]', emphasis ? 'font-semibold' : 'font-medium')}>
          {title}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {date && <p className="text-fg-3 m-0 text-[12.5px] whitespace-nowrap">{date}</p>}
          {/* Reserved even when absent, so dates line up across every row. */}
          <div className="w-7 shrink-0">{actions}</div>
        </div>
      </div>

      {(meta || amount) && (
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <p className="text-fg-3 m-0 min-w-0 text-[12.5px]">{meta}</p>
          {amount && (
            <p className="m-0 mr-[34px] shrink-0 text-[13.5px] font-semibold whitespace-nowrap">
              {amount}
            </p>
          )}
        </div>
      )}

      {note && <p className="text-fg-4 m-0 mt-1 text-[12.5px] whitespace-pre-line">{note}</p>}
    </li>
  )
}

export function VehicleServiceHistory({ vehicleId }: Props) {
  const { t } = useTranslation('vehicles')
  const format = useFormatters()
  const { data, isLoading } = useServiceRecords(vehicleId)
  const deleteRecord = useDeleteServiceRecord(vehicleId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceRecord | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<ServiceRecord | null>(null)

  const openAdd = () => {
    setEditing(undefined)
    setDialogOpen(true)
  }

  const openEdit = (record: ServiceRecord) => {
    setEditing(record)
    setDialogOpen(true)
  }

  const day = (iso: string) =>
    format.date(parseDay(iso), { month: 'short', day: 'numeric', year: 'numeric' })

  /** "due in 1,200 mi" / "overdue by 11,811 mi" — the state itself is carried by the dot colour. */
  const dueLabel = (due: ServiceDue): string => {
    if (due.milesRemaining != null) {
      const miles = format.number(Math.abs(due.milesRemaining))
      return due.milesRemaining < 0
        ? t('service.due.overdueByMiles', { count: miles })
        : t('service.due.inMiles', { count: miles })
    }
    if (due.daysRemaining != null) {
      if (due.daysRemaining === 0) return t('service.due.dueToday')
      return due.daysRemaining < 0
        ? t('service.due.overdueByDays', { count: Math.abs(due.daysRemaining) })
        : t('service.due.inDays', { count: due.daysRemaining })
    }
    return ''
  }

  const items = data?.items ?? []
  const due = data?.due
  const summary = data?.summary

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <PanelHeading
          title={t('service.title')}
          description={
            summary && summary.recordCount > 0
              ? t('service.subtitle', {
                  count: summary.recordCount,
                  total: format.currency(summary.totalCost),
                })
              : t('service.description')
          }
        />
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="size-4" />
          {t('service.logService')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-fg-3 m-0 py-6 text-center text-[13px]">{t('service.loading')}</p>
      ) : items.length === 0 ? (
        <div className="py-8 text-center">
          <Wrench className="text-fg-4 mx-auto size-7" />
          <p className="text-fg-3 m-0 mt-2 text-[13px]">{t('service.empty')}</p>
        </div>
      ) : (
        // The rail is a left border on the list; each dot covers it with a ring.
        <ul className="border-border-soft m-0 mt-3 ml-[3px] flex list-none flex-col border-l p-0 [&>li:first-child]:pt-0 [&>li:last-child]:pb-0">
          {due && (
            <TimelineRow
              dotClass={DUE_TONE[due.state]}
              emphasis
              title={translateDomain('serviceType', due.serviceType)}
              meta={[
                due.nextDueOdometer != null
                  ? t('service.odometerValue', { value: format.number(due.nextDueOdometer) })
                  : null,
                dueLabel(due),
              ]
                .filter(Boolean)
                .join(' · ')}
              date={due.nextDueOn ? t('service.due.dueOn', { date: day(due.nextDueOn) }) : ''}
              amount=""
            />
          )}

          {items.map((record) => (
            <TimelineRow
              key={record.id}
              dotClass="bg-border"
              title={translateDomain('serviceType', record.serviceType)}
              meta={[
                record.vendor,
                record.odometer != null
                  ? t('service.odometerValue', { value: format.number(record.odometer) })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              note={record.notes}
              date={day(record.performedOn)}
              amount={record.cost != null ? format.currency(record.cost) : '—'}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={t('service.rowActions.label')}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(record)}>
                      {t('service.rowActions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-error focus:text-error"
                      onClick={() => setDeleteTarget(record)}
                    >
                      {t('service.rowActions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          ))}
        </ul>
      )}

      <ServiceRecordDialog
        vehicleId={vehicleId}
        record={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('service.confirmDelete.title')}
        description={t('service.confirmDelete.description')}
        confirmLabel={t('service.confirmDelete.confirm')}
        loading={deleteRecord.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteRecord.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </Card>
  )
}
