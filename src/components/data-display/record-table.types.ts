import type { LucideIcon } from 'lucide-react'

export type CellAlign = 'left' | 'right'

export type Cell =
  | {
      kind: 'avatar'
      primary: string
      secondary?: string
      initials: string
      imageUrl?: string
      /** Stands in for `initials` when there is no image — initials read oddly on an object. */
      fallbackIcon?: LucideIcon
      avatarSize?: number
      avatarBg: string
      avatarFg: string
      avatarRadius?: string
      subFontMono?: boolean
      align?: CellAlign
    }
  | { kind: 'stack'; primary: string; secondary?: string; weight?: number; subFontMono?: boolean; align?: CellAlign }
  | { kind: 'text'; primary: string; fontMono?: boolean; align?: CellAlign }
  | { kind: 'badge'; status: string; align?: CellAlign }
  /** Several badges on one row, e.g. a lifecycle status plus a derived flag. */
  | { kind: 'badges'; statuses: string[]; align?: CellAlign }
  | { kind: 'amount'; primary: string; tone?: string; align?: CellAlign }
  | { kind: 'meter'; primary: string; pct: string; tone: string; align?: CellAlign }
  | { kind: 'switch'; on: boolean; align?: CellAlign }
  | { kind: 'actions'; align?: CellAlign; items?: RowActionItem[] }

export interface RowActionItem {
  label: string
  onClick: () => void
  destructive?: boolean
}

export interface Column {
  label: string
  align: CellAlign
}

export interface Row {
  key: string
  cells: Cell[]
}
