interface PanelHeadingProps {
  title: string
  description?: string
  className?: string
}

/** Title + optional description stack used at the top of a card/section (Revenue, Fleet status, Settings sections, ...). */
export function PanelHeading({ title, description, className }: PanelHeadingProps) {
  return (
    <div className={className}>
      <h2 className="text-panel-title m-0">{title}</h2>
      {description && (
        <p className="text-fg-4 m-0 mt-[3px] text-[12.5px]" style={{ textWrap: 'pretty' }}>
          {description}
        </p>
      )}
    </div>
  )
}
