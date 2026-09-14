import { Ellipsis } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import type { Cell, Column, Row } from './record-table.types'

function CellContent({ cell }: { cell: Cell }) {
  switch (cell.kind) {
    case 'avatar':
      return (
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-[30px] shrink-0 items-center justify-center text-[11px] font-bold"
            style={{ background: cell.avatarBg, color: cell.avatarFg, borderRadius: cell.avatarRadius ?? '99px' }}
          >
            {cell.initials}
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
      return <span className="text-fg-2 text-[13px] whitespace-nowrap tabular-nums">{cell.primary}</span>
    case 'badge':
      return <StatusBadge status={cell.status} />
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
      return (
        <button
          type="button"
          aria-label="Row actions"
          className="text-fg-4 hover:bg-surface hover:border-border hover:text-foreground inline-flex size-7 items-center justify-center rounded-[7px] border border-transparent transition-colors"
        >
          <Ellipsis className="size-4" />
        </button>
      )
  }
}

interface TabDef {
  label: string
  selected: boolean
  onClick: () => void
}

interface RecordTableProps {
  title?: string
  tabs?: TabDef[]
  columns: Column[]
  rows: Row[]
  rowCountLabel: string
  pageNote: string
  minWidth?: string
}

export function RecordTable({ title, tabs, columns, rows, rowCountLabel, pageNote, minWidth = '800px' }: RecordTableProps) {
  return (
    <section className="bg-surface border-border shadow-xs overflow-hidden rounded-xl border">
      <div className="border-border-soft flex flex-wrap items-center gap-3.5 border-b px-4 py-3.5">
        {title && <h2 className="m-0 shrink-0 text-[14.5px] font-semibold">{title}</h2>}
        {tabs && tabs.length > 0 && (
          <div className="bg-surface-3 flex shrink-0 gap-0.5 rounded-[9px] p-[3px]" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={t.selected}
                onClick={t.onClick}
                className="rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors"
                style={{
                  background: t.selected ? 'var(--color-surface)' : 'transparent',
                  color: t.selected ? 'var(--color-foreground)' : 'var(--color-fg-3)',
                  boxShadow: t.selected ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        <span className="text-fg-4 text-[12.5px] tabular-nums">{rowCountLabel}</span>
      </div>

      <div className="vx-scroll overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth }}>
          <thead>
            <tr>
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
            {rows.map((row) => (
              <tr key={row.key} className="border-border-soft hover:bg-surface-2 border-b transition-colors last:border-0">
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
        <span className="text-fg-3 text-[12.5px]">{pageNote}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled
            className="bg-surface border-border text-border-strong h-[30px] cursor-not-allowed rounded-lg border px-[11px] text-[12.5px]"
          >
            Previous
          </button>
          <button
            type="button"
            className="bg-surface border-border text-fg-2 hover:bg-surface-3 h-[30px] rounded-lg border px-[11px] text-[12.5px] font-semibold transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}
