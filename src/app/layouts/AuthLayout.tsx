import { Car } from 'lucide-react'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted px-4 py-12">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Car className="size-5" aria-hidden />
        </div>
        <span className="text-section-title">Veltrio</span>
      </div>
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <Outlet />
      </div>
    </div>
  )
}
