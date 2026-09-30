import { useId, useState } from 'react'
import { Ellipsis, GripVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from './StatusBadge'
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination'
import type { Cell, Column, Row } from './record-table.types'

function CellContent({ cell }: { cell: Cell }) {
  const { t } = useTranslation('common')

  switch (cell.kind) {
    case 'avatar':
      return (
        <div className="flex items-center gap-2.5">
          <span
            className="flex shrink-0 items-center justify-center overflow-hidden font-bold"
            style={{
              width: cell.avatarSize ?? 30,
              height: cell.avatarSize ?? 30,
              // Initials track the box size.
              fontSize: cell.avatarSize ? Math.round(cell.avatarSize * 0.37) : 11,
              background: cell.avatarBg,
              color: cell.avatarFg,
              borderRadius: cell.avatarRadius ?? '99px',
            }}
          >
            {cell.imageUrl ? (
              <img src={cell.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
            ) : cell.fallbackIcon ? (
              <cell.fallbackIcon
                style={{ width: '45%', height: '45%' }}
                strokeWidth={1.75}
                aria-hidden
              />
            ) : (
              cell.initials
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold whitespace-nowrap">{cell.primary}</span>
            {cell.secondary && (
              <span
                className={cn('text-fg-4 block text-[11.5px]', cell.subFontMono && 'font-mono')}
              >
                {cell.secondary}
              </span>
            )}
          </span>
        </div>
      )
    case 'stack':
      return (
        <div>
          <span className="block text-[13.5px] whitespace-nowrap" style={{ fontWeight: cell.weight ?? 600 }}>
            {cell.primary}
          </span>
          {cell.secondary && (
            <span className={cn('text-fg-4 mt-px block text-[11.5px]', cell.subFontMono && 'font-mono')}>
              {cell.secondary}
            </span>
          )}
        </div>
      )
    case 'text':
      return (
        <span
          className={cn(
            'text-fg-2 text-[13px] whitespace-nowrap tabular-nums',
            cell.fontMono && 'font-mono',
          )}
        >
          {cell.primary}
        </span>
      )
    case 'badge':
      return <StatusBadge status={cell.status} label={cell.label} />
    case 'badges':
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          {cell.statuses.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </span>
      )
    case 'amount':
      return (
        <span className="text-[13.5px] font-semibold whitespace-nowrap tabular-nums" style={{ color: cell.tone ?? 'var(--color-foreground)' }}>
          {cell.primary}
        </span>
      )
    case 'meter':
      return (
        <div className="flex min-w-[92px] items-center gap-[9px]">
          <span className="bg-surface-3 h-1.5 flex-1 overflow-hidden rounded-full">
            <span className="block h-full rounded-full" style={{ width: cell.pct, background: cell.tone }} />
          </span>
          <span className="text-fg-2 shrink-0 text-xs font-semibold tabular-nums">{cell.primary}</span>
        </div>
      )
    case 'switch':
      return (
        <span
          className="inline-flex h-5 w-[34px] items-center rounded-full p-0.5"
          style={{ background: cell.on ? 'var(--color-primary)' : 'var(--color-border-strong)', justifyContent: cell.on ? 'flex-end' : 'flex-start' }}
        >
          <span className="bg-surface shadow-xs size-4 rounded-full" />
        </span>
      )
    case 'actions':
      if (!cell.items || cell.items.length === 0) {
        return (
          <button
            type="button"
            aria-label={t('table.rowActions')}
            className="text-fg-4 hover:bg-surface hover:border-border hover:text-foreground inline-flex size-7 items-center justify-center rounded-[7px] border border-transparent transition-colors"
          >
            <Ellipsis className="size-4" />
          </button>
        )
      }
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('table.rowActions')}
              onClick={(e) => e.stopPropagation()}
              className="text-fg-4 hover:bg-surface hover:border-border hover:text-foreground inline-flex size-7 items-center justify-center rounded-[7px] border border-transparent transition-colors"
            >
              <Ellipsis className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {cell.items.map((item) => (
              <DropdownMenuItem
                key={item.label}
                onSelect={item.onClick}
                className={item.destructive ? 'text-error focus:text-error' : undefined}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
  }
}

interface TabDef {
  /** Stable identity for the tab — translated labels can't double as React keys. */
  key: string
  label: string
  selected: boolean
  onClick: () => void
  /** Matching-row count shown next to the label — omit to render the label alone. */
  count?: number
}

interface RecordTableProps {
  title?: string
  tabs?: TabDef[]
  columns: Column[]
  rows: Row[]
  /** Omit to hide entirely — not every table needs a count next to its title. */
  rowCountLabel?: string
  /**
   * Footer text. Omit it on a paginated table to get the shared "1–10 of 43" range; supply it
   * for states the range does not describe, such as drafts or an empty result.
   */
  pageNote?: string
  minWidth?: string
  onRowClick?: (key: string) => void
  /** Omit to keep the footer's static/disabled Previous-Next look used elsewhere. */
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    /** Adds the rows-per-page picker. */
    onPageSizeChange?: (pageSize: number) => void
  }
  /** Rendered at the end of the header row (e.g. an Export button) — after the row count label. */
  actions?: React.ReactNode
  /** Adds a drag handle column so rows can be manually reordered — pairs with onReorder. */
  reorderable?: boolean
  /** Called with the full list of row keys in their new order after a drag-drop. */
  onReorder?: (orderedKeys: string[]) => void
  /** Shown in place of the rows when there are none — keeps the tabs/filters reachable. */
  emptyState?: React.ReactNode
}

export function RecordTable({
  title,
  tabs,
  columns,
  rows,
  rowCountLabel,
  pageNote,
  minWidth = '800px',
  onRowClick,
  pagination,
  actions,
  reorderable = false,
  onReorder,
  emptyState,
}: RecordTableProps) {
  const { t } = useTranslation('common')
  const [dragKey, setDragKey] = useState<string | null>(null)
  const rowsPerPageId = useId()
  const hasNextPage = pagination ? pagination.page * pagination.pageSize < pagination.total : false
  const footerNote =
    pageNote ??
    (pagination && pagination.total > 0
      ? t('table.showing', {
          from: (pagination.page - 1) * pagination.pageSize + 1,
          to: Math.min(pagination.page * pagination.pageSize, pagination.total),
          total: pagination.total,
        })
      : undefined)

  function handleDrop(overKey: string) {
    if (!dragKey || dragKey === overKey || !onReorder) {
      setDragKey(null)
      return
    }
    const keys = rows.map((r) => r.key)
    const from = keys.indexOf(dragKey)
    const to = keys.indexOf(overKey)
    if (from === -1 || to === -1) {
      setDragKey(null)
      return
    }
    const next = [...keys]
    next.splice(from, 1)
    next.splice(to, 0, dragKey)
    onReorder(next)
    setDragKey(null)
  }
  return (
    <Card as="section" className="overflow-hidden">
      <div className="border-border-soft flex flex-wrap items-center gap-3.5 border-b px-4 py-3.5">
        {title && <h2 className="text-panel-title m-0 shrink-0">{title}</h2>}
        {tabs && tabs.length > 0 && (
          <div className="bg-surface-3 flex shrink-0 gap-0.5 rounded-[9px] p-[3px]" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={tab.selected}
                onClick={tab.onClick}
                className="text-meta rounded-[7px] px-3 py-1.5 whitespace-nowrap transition-colors"
                style={{
                  background: tab.selected ? 'var(--color-surface)' : 'transparent',
                  color: tab.selected ? 'var(--color-foreground)' : 'var(--color-fg-3)',
                  boxShadow: tab.selected ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {tab.label}
                {/* Proportional figures on purpose — tabular ones pad each digit to a uniform
                    (wider) advance, which reads as stretched next to the parentheses. */}
                {tab.count !== undefined && (
                  <span className="ml-1" style={{ color: 'var(--color-fg-4)' }}>
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        {rowCountLabel && <span className="text-fg-4 text-[12.5px] tabular-nums">{rowCountLabel}</span>}
        {actions}
      </div>

      <div className="vx-scroll overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth }}>
          <thead>
            <tr>
              {reorderable && <th scope="col" className="bg-surface-2 border-border w-9 border-b" />}
              {columns.map((c) => (
                <th
                  key={c.label + c.align}
                  scope="col"
                  className="bg-surface-2 border-border text-fg-3 border-b px-4 py-[9px] text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase"
                  style={{ textAlign: c.align }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && emptyState && (
              <tr>
                {/* EmptyState draws its own dashed border for standalone use; inside the card
                    that doubles the table's own, so it is stripped here rather than by callers. */}
                <td
                  colSpan={columns.length + (reorderable ? 1 : 0)}
                  className="p-0 [&>*]:rounded-none [&>*]:border-0"
                >
                  {emptyState}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.key}
                onClick={onRowClick ? () => onRowClick(row.key) : undefined}
                onDragOver={reorderable ? (e) => e.preventDefault() : undefined}
                onDrop={reorderable ? () => handleDrop(row.key) : undefined}
                className={cn(
                  'border-border-soft hover:bg-surface-2 border-b transition-colors last:border-0',
                  onRowClick && 'cursor-pointer',
                  dragKey === row.key && 'opacity-40',
                )}
              >
                {reorderable && (
                  <td className="px-2 py-[11px] align-middle" onClick={(e) => e.stopPropagation()}>
                    <span
                      draggable
                      onDragStart={() => setDragKey(row.key)}
                      onDragEnd={() => setDragKey(null)}
                      className="text-fg-4 hover:text-foreground flex size-6 cursor-grab items-center justify-center active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" />
                    </span>
                  </td>
                )}
                {row.cells.map((cell, i) => (
                  <td key={i} className="px-4 py-[11px] align-middle" style={{ textAlign: cell.align ?? 'left' }}>
                    <CellContent cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-border-soft bg-surface-2 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-[11px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-fg-3 text-[12.5px] tabular-nums">{footerNote}</span>
          {pagination?.onPageSizeChange && (
            <span className="flex items-center gap-2">
              <span id={rowsPerPageId} className="text-fg-3 text-[12.5px]">
                {t('table.rowsPerPage')}
              </span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(value) => {
                  pagination.onPageSizeChange?.(Number(value))
                  // Page 4 at 10 rows is not page 4 at 50; start the new size from the top.
                  pagination.onPageChange(1)
                }}
              >
                {/* Sized and weighted like the Previous/Next buttons it sits beside. */}
                <SelectTrigger
                  aria-labelledby={rowsPerPageId}
                  className="border-border bg-surface text-fg-2 h-[30px] w-[68px] rounded-lg px-[11px] text-[12.5px] font-semibold"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-[12.5px]">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={pagination ? pagination.page <= 1 : true}
            onClick={() => pagination?.onPageChange(pagination.page - 1)}
            className={cn(
              'h-[30px] rounded-lg border px-[11px] text-[12.5px] transition-colors',
              (pagination ? pagination.page <= 1 : true)
                ? 'bg-surface border-border text-border-strong cursor-not-allowed'
                : 'bg-surface border-border text-fg-2 hover:bg-surface-3 font-semibold',
            )}
          >
            {t('actions.previous')}
          </button>
          <button
            type="button"
            // Without `pagination` there is nothing to advance to, so match Previous and stay
            // disabled — otherwise the button invites a click that does nothing.
            disabled={!hasNextPage}
            onClick={() => pagination?.onPageChange(pagination.page + 1)}
            className={cn(
              'h-[30px] rounded-lg border px-[11px] text-[12.5px] font-semibold transition-colors',
              !hasNextPage
                ? 'bg-surface border-border text-border-strong cursor-not-allowed'
                : 'bg-surface border-border text-fg-2 hover:bg-surface-3',
            )}
          >
            {t('actions.next')}
          </button>
        </div>
      </div>
    </Card>
  )
}
