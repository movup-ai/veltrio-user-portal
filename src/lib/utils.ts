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
