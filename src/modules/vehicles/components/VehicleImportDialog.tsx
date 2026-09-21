import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, Copy, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import {
  MAX_IMPORT_BYTES,
  vehicleImportApi,
  type ImportPreview,
  type ImportRow,
} from '../api/vehicle-import.api'
import { vehicleKeys } from '../hooks/use-vehicles'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_ICON = {
  valid: CheckCircle2,
  error: AlertCircle,
  duplicate: Copy,
} as const

const STATUS_TONE = {
  valid: 'text-success',
  error: 'text-error',
  duplicate: 'text-warning',
} as const

function RowLine({ row }: { row: ImportRow }) {
  const { t } = useTranslation('vehicles')
  const Icon = STATUS_ICON[row.status]
  const name = [row.make, row.model].filter(Boolean).join(' ') || t('import.unnamedRow')
  const details = [row.plate, row.vin].filter(Boolean).join(' · ')

  return (
    <div className="border-border flex items-start gap-2.5 border-b py-2 last:border-0">
      <Icon className={cn('mt-[2px] size-4 shrink-0', STATUS_TONE[row.status])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">
          {name}
          {details && <span className="text-fg-4 font-mono text-[12px] font-normal"> {details}</span>}
        </p>
        {row.errors.map((error, index) => (
          <p key={index} className="text-fg-3 text-[12px]">
            {/* The spreadsheet row number only earns its place when you have to go find it. */}
            <span className="text-fg-4">{t('import.rowLabel', { row: row.row })} · </span>
            {error.column ? `${error.column}: ${error.message}` : error.message}
          </p>
        ))}
      </div>
    </div>
  )
}

export function VehicleImportDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation('vehicles')
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)

  const reset = () => {
    setPreview(null)
    setFileName(null)
    setIsBusy(false)
  }

  const close = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) {
      toast({ title: t('import.tooLarge', { size: MAX_IMPORT_BYTES / (1024 * 1024) }), variant: 'error' })
      return
    }
    setIsBusy(true)
    setFileName(file.name)
    try {
      setPreview(await vehicleImportApi.preview(file))
    } catch (error) {
      setFileName(null)
      toast({ title: t('import.previewFailed'), description: normalizeApiError(error).message, variant: 'error' })
    } finally {
      setIsBusy(false)
    }
  }

  const handleCommit = async () => {
    const valid = preview?.rows.filter((row) => row.status === 'valid' && row.values) ?? []
    if (valid.length === 0) return
    setIsBusy(true)
    try {
      const result = await vehicleImportApi.commit(valid.map((row) => row.values))
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      toast({ title: t('import.imported', { count: result.imported }), variant: 'success' })
      close(false)
    } catch (error) {
      toast({ title: t('import.importFailed'), description: normalizeApiError(error).message, variant: 'error' })
    } finally {
      setIsBusy(false)
    }
  }

  const skipped = preview ? preview.total - preview.valid : 0

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription>{t('import.description')}</DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => !isBusy && inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && !isBusy && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              void handleFile(e.dataTransfer.files[0])
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-[9px] border border-dashed px-6 py-12 text-center transition-colors',
              isBusy ? 'cursor-wait opacity-60' : 'cursor-pointer',
              isDragging ? 'border-primary bg-tint' : 'border-border-strong hover:bg-surface-2',
            )}
          >
            <FileSpreadsheet className="text-fg-4 size-7" aria-hidden />
            <p className="text-[13px] font-semibold">
              {isBusy ? t('import.checking') : t('import.dropzone')}
            </p>
            <p className="text-fg-4 text-[12px]">{t('import.dropzoneHint')}</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        ) : (
          <div>
            <div className="border-border bg-surface-2 mb-3 flex items-center justify-between rounded-[9px] border px-3 py-2">
              <p className="min-w-0 truncate text-[13px] font-semibold">{fileName}</p>
              <p className="text-fg-3 shrink-0 text-[12.5px]">
                {t('import.summary', { valid: preview.valid, skipped })}
              </p>
            </div>
            <div className="max-h-[320px] overflow-y-auto pr-1">
              {preview.rows.map((row) => (
                <RowLine key={row.row} row={row} />
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => void vehicleImportApi.downloadTemplate()}
          >
            <Download className="size-3.5" />
            {t('import.downloadTemplate')}
          </Button>
          <div className="flex items-center gap-2">
            {preview && (
              <Button type="button" variant="outline" onClick={reset} disabled={isBusy}>
                {t('import.chooseAnother')}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => void handleCommit()}
              loading={isBusy && Boolean(preview)}
              disabled={!preview || preview.valid === 0 || isBusy}
              className="gap-1.5"
            >
              <Upload className="size-3.5" />
              {preview ? t('import.confirm', { count: preview.valid }) : t('import.confirmEmpty')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
