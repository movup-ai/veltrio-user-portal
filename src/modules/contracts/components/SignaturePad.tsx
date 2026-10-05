import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import SignaturePadCore from 'signature_pad'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Dark ink on a pad that stays white in either theme: the PDF prints it on white paper. */
const INK = '#0f172a'

interface SignaturePadProps {
  /** The drawing as a PNG data URL after each stroke, or undefined once it is cleared. */
  onChange: (drawing: string | undefined) => void
  label: string
  clearLabel: string
  invalid?: boolean
}

/** A box to sign in with a finger, a stylus or a mouse. */
export function SignaturePad({ onChange, label, clearLabel, invalid }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadCore | null>(null)
  const [empty, setEmpty] = useState(true)

  const report = useEffectEvent(() => {
    const pad = padRef.current
    if (!pad) return
    setEmpty(pad.isEmpty())
    onChange(pad.isEmpty() ? undefined : pad.toDataURL('image/png'))
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // A heavier line than the library's default, which prints faint once scaled into the PDF.
    const pad = new SignaturePadCore(canvas, { penColor: INK, minWidth: 1, maxWidth: 3.2 })
    padRef.current = pad

    // Sized in device pixels, or strokes blur on a phone. Resizing wipes a canvas, so the
    // strokes are kept and replayed at the new size.
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const strokes = pad.toData()
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)
      pad.fromData(strokes)
    }
    resize()
    // From the first touch, not the release: the hint must not sit under a stroke in progress.
    const began = () => setEmpty(false)
    pad.addEventListener('beginStroke', began)
    pad.addEventListener('endStroke', report)
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      pad.off()
      padRef.current = null
    }
  }, [])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        aria-invalid={invalid || undefined}
        // touch-none: without it a phone scrolls the page instead of drawing.
        className={cn(
          'border-input block h-[160px] w-full touch-none rounded-[10px] border bg-white',
          invalid && 'border-error',
        )}
      />
      {empty && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-slate-400">
          {label}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={empty}
        onClick={() => {
          padRef.current?.clear()
          setEmpty(true)
          onChange(undefined)
        }}
        className="absolute top-1.5 right-1.5 h-7 gap-1 px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <Eraser className="size-3.5" aria-hidden />
        {clearLabel}
      </Button>
    </div>
  )
}
