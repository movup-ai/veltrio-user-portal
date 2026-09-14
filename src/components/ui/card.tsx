import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Native element to render — 'section' for panels with their own <h2>, 'div' (default) otherwise. */
  as?: 'div' | 'section'
  /** Adds the border/shadow hover treatment used by clickable-feeling cards (KpiCard, LocationCard, ...). */
  hoverable?: boolean
}

/**
 * Base card chrome shared by every bordered panel in the app (KPI cards,
 * stat strips, revenue/fleet panels, location cards, record tables,
 * settings sections). Deliberately unopinionated about padding — that
 * varies by density across call sites, so compose it via `className`.
 */
export const Card = React.forwardRef<HTMLElement, CardProps>(
  ({ as: Comp = 'div', hoverable, className, ...props }, ref) => {
    return React.createElement(Comp, {
      ref,
      className: cn(
        'bg-surface border-border shadow-xs rounded-xl border',
        hoverable && 'transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm',
        className,
      ),
      ...props,
    })
  },
)
Card.displayName = 'Card'
