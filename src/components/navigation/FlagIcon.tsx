import type { Language } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Inline SVG flags rather than emoji — Windows renders regional-indicator pairs as bare
 * letters ("US"), which looks broken next to the rest of the chrome.
 */
function UsFlag() {
  return (
    <svg viewBox="0 0 21 15" aria-hidden focusable="false">
      <rect width="21" height="15" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 15) / 13} width="21" height={15 / 13} fill="#D02F44" />
      ))}
      <rect width="9" height={(15 / 13) * 7} fill="#46467F" />
      <g fill="#fff">
        {Array.from({ length: 4 }, (_, row) =>
          Array.from({ length: 6 }, (_, col) => (
            <circle key={`${row}-${col}`} cx={0.9 + col * 1.5 + (row % 2) * 0.75} cy={0.9 + row * 1.9} r="0.42" />
          )),
        )}
      </g>
    </svg>
  )
}

function EsFlag() {
  return (
    <svg viewBox="0 0 21 15" aria-hidden focusable="false">
      <rect width="21" height="15" fill="#DD172C" />
      <rect y="3.75" width="21" height="7.5" fill="#FFD133" />
      <rect x="3.2" y="6" width="2.1" height="2.6" rx="0.3" fill="#DD172C" opacity="0.85" />
    </svg>
  )
}

const FLAGS: Record<Language, () => React.ReactElement> = {
  en: UsFlag,
  es: EsFlag,
}

export function FlagIcon({ language, className }: { language: Language; className?: string }) {
  const Flag = FLAGS[language]

  return (
    <span className={cn('border-border/60 inline-block h-[13px] w-[18px] shrink-0 overflow-hidden rounded-[2px] border', className)}>
      <Flag />
    </span>
  )
}
