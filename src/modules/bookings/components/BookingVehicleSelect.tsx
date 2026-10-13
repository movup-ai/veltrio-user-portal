import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { vehicleDisplayName } from '@/modules/vehicles/utils/vehicle.utils'
import { isTaken, searchVehicleOptions } from '../utils/booking.vehicle-options'
import { BookingVehicleRow } from './BookingVehicleRow'
import type { VehicleOption } from './BookingVehiclePicker'

interface BookingVehicleSelectProps {
  options: VehicleOption[]
  selectedId: string
  onSelect: (vehicle: Vehicle) => void
  /** Trip length, so each row can show the run-out cost alongside the headline rate. */
  hours: number
  placeholder: string
  /** Said in place of the list when nothing matches what was typed. */
  emptyText: string
  id?: string
  'aria-label'?: string
}

/**
 * A fleet as one field: closed it is a line, open it is a list that scrolls and narrows as the
 * counter types. For a dialog, where a list laid out in full would run past the screen.
 */
export function BookingVehicleSelect({
  options,
  selectedId,
  onSelect,
  hours,
  placeholder,
  emptyText,
  id,
  ...aria
}: BookingVehicleSelectProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const active = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLDivElement>(null)

  const shown = useMemo(() => searchVehicleOptions(options, query), [options, query])
  // Those that can be picked come first, so the arrows stay among them by stopping at this count.
  const pickable = shown.filter((option) => !isTaken(option)).length
  const selected = options.find((option) => option.vehicle.id === selectedId)
  // With the plate: cars of one model read the same without it.
  const label = selected ? `${vehicleDisplayName(selected.vehicle)} · ${selected.vehicle.plate}` : ''

  useEffect(() => {
    if (open) active.current?.scrollIntoView({ block: 'nearest' })
  }, [open, highlighted])

  const show = () => {
    if (open) return
    setOpen(true)
    setQuery('')
    setHighlighted(0)
  }
  const close = () => {
    setOpen(false)
    setQuery('')
  }
  const pick = (option: VehicleOption | undefined) => {
    if (!option || isTaken(option)) return
    onSelect(option.vehicle)
    close()
  }

  return (
    <Popover open={open} onOpenChange={(next) => (next ? show() : close())}>
      <PopoverAnchor asChild>
        <div
          ref={field}
          className={cn(
            'border-input bg-background text-body flex h-9 w-full items-center gap-2 rounded-md border px-3 py-1 shadow-xs transition-colors',
            'focus-within:outline-ring focus-within:outline-2 focus-within:outline-offset-2',
          )}
        >
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            // Open, the field is for typing; what was picked stays readable as its placeholder.
            placeholder={open && label ? label : placeholder}
            className="placeholder:text-muted-foreground w-full min-w-0 truncate bg-transparent outline-none"
            value={open ? query : label}
            onFocus={show}
            onClick={show}
            onChange={(event) => {
              setQuery(event.target.value)
              setHighlighted(0)
              setOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                if (!open) return show()
                setHighlighted((index) => Math.min(index + 1, Math.max(pickable - 1, 0)))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setHighlighted((index) => Math.max(index - 1, 0))
              } else if (event.key === 'Enter' && open) {
                // Not the form's submit: Enter here answers the list.
                event.preventDefault()
                pick(shown[highlighted])
              }
            }}
            {...aria}
          />
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1"
        // Focus stays in the field, so typing goes on narrowing the list.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // The field is outside the list to Radix: the very focus that opens it would dismiss it.
        onInteractOutside={(event) => {
          if (field.current?.contains(event.target as Node)) event.preventDefault()
        }}
      >
        {shown.length === 0 ? (
          <p className="text-fg-4 m-0 px-2 py-2 text-[12.5px]">{emptyText}</p>
        ) : (
          <div id={listId} role="listbox" className="vx-scroll max-h-[264px] overflow-y-auto">
            {shown.map((option, index) => {
              const taken = isTaken(option)
              return (
                <button
                  key={option.vehicle.id}
                  ref={index === highlighted ? active : undefined}
                  type="button"
                  role="option"
                  aria-selected={option.vehicle.id === selectedId}
                  disabled={taken}
                  onMouseEnter={() => !taken && setHighlighted(index)}
                  onClick={() => pick(option)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left transition-colors',
                    option.vehicle.id === selectedId && 'bg-tint',
                    taken ? 'cursor-not-allowed opacity-55' : index === highlighted && 'bg-muted',
                  )}
                >
                  <BookingVehicleRow option={option} hours={hours} />
                </button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
