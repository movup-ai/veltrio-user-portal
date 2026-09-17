import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { enUS, es } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const DATE_FNS_LOCALES = { en: enUS, es } as const

/**
 * Month grid used inside DatePicker. Styled entirely through `classNames` against our tokens
 * rather than importing react-day-picker's stylesheet, so it can't drift from the rest of the
 * form chrome or leak global rules.
 */
export function Calendar({ className, classNames, captionLayout, ...props }: DayPickerProps) {
  const { i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? 'en') as keyof typeof DATE_FNS_LOCALES

  /**
   * In dropdown mode each control is a native `<select>` plus a sibling label span. Upstream
   * hides the select over the span; without their stylesheet both render, which is why the
   * caption has to be styled differently here — as the visible pill, with the real select
   * laid transparently on top of it.
   */
  const isDropdown = Boolean(captionLayout?.startsWith('dropdown'))

  return (
    <DayPicker
      locale={DATE_FNS_LOCALES[language] ?? enUS}
      showOutsideDays
      captionLayout={captionLayout}
      className={cn('w-fit', className)}
      classNames={{
        months: 'relative flex flex-col gap-4',
        month: 'flex flex-col gap-3',
        // Padding keeps the dropdowns clear of the absolutely-positioned nav buttons.
        month_caption: cn('flex h-8 items-center justify-center', isDropdown && 'px-9'),
        caption_label: isDropdown
          ? 'border-input bg-background text-fg-2 pointer-events-none flex h-7 items-center gap-1 rounded-[7px] border px-2 text-[12.5px] font-semibold'
          : 'text-[13.5px] font-semibold',
        dropdowns: 'flex items-center gap-1.5',
        dropdown_root: 'relative inline-flex items-center',
        dropdown: 'absolute inset-0 z-10 size-full cursor-pointer opacity-0',
        nav: 'absolute inset-x-0 top-0 flex h-8 items-center justify-between',
        button_previous:
          'text-fg-3 hover:bg-surface-3 hover:text-foreground inline-flex size-7 items-center justify-center rounded-[7px] transition-colors disabled:pointer-events-none disabled:opacity-40',
        button_next:
          'text-fg-3 hover:bg-surface-3 hover:text-foreground inline-flex size-7 items-center justify-center rounded-[7px] transition-colors disabled:pointer-events-none disabled:opacity-40',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-fg-4 w-9 text-[11px] font-semibold',
        weeks: '',
        week: 'flex w-full',
        day: 'p-0',
        day_button:
          'text-fg-2 hover:bg-surface-3 hover:text-foreground flex size-9 items-center justify-center rounded-[8px] text-[12.5px] font-medium tabular-nums transition-colors',
        selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold [&>button]:hover:bg-primary',
        today: '[&>button]:text-primary [&>button]:font-bold',
        outside: '[&>button]:text-fg-4 [&>button]:opacity-50',
        disabled: '[&>button]:text-fg-4 [&>button]:pointer-events-none [&>button]:line-through [&>button]:opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, size: _size, ...rest }) => {
          const Icon = orientation === 'left' ? ChevronLeft : orientation === 'down' ? ChevronDown : ChevronRight
          // `down` is the caret inside a dropdown pill, so it sits a notch smaller than the nav arrows.
          return <Icon className={cn(orientation === 'down' ? 'size-3.5 shrink-0' : 'size-4', chevronClass)} {...rest} />
        },
      }}
      {...props}
    />
  )
}
