interface BookingEffectsProps {
  title: string
  lines: string[]
}

/** What an action does besides the thing it is named for, so none of it is a surprise. */
export function BookingEffects({ title, lines }: BookingEffectsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-fg-3 m-0 text-[11px] font-semibold tracking-wide uppercase">{title}</p>
      <ul aria-label={title} className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px]">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
