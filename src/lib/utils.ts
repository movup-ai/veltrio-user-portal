import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The theme's type scale (theme.css). Unregistered, tailwind-merge took `text-label` for a colour
// and dropped it beside `text-primary-foreground`, so filled buttons lost their font size.
const TYPE_SCALE = [
  'page-title', 'section-title', 'card-title', 'panel-title', 'heading', 'body', 'body-sm',
  'label', 'description', 'caption', 'caption-sm', 'meta', 'stat-lg', 'stat-md', 'table-header',
]

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: TYPE_SCALE }] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** A copy of `items` with the one at `from` moved to `to`, for drag-and-drop reordering. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  if (from < 0 || to < 0 || from >= next.length || to >= next.length) return next
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
