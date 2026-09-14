import { cn } from '@/lib/utils'

export function PageContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-5 p-4 pb-11 sm:px-6 sm:pt-6', className)} {...props} />
}
