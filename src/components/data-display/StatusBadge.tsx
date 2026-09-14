import { statusColors } from './status-colors'

export function StatusBadge({ status }: { status: string }) {
  const { bg, fg } = statusColors(status)

  return (
    <span
      className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full py-[3px] pr-[9px] pl-[7px] text-[11.5px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      <span className="size-[6px] rounded-full" style={{ background: fg }} />
      {status}
    </span>
  )
}
