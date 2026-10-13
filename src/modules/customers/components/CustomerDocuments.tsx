import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentUpload } from '@/components/forms/DocumentUpload'
import { FormField } from '@/components/forms/FormField'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { ACCEPTED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '../api/customer-document.api'
import {
  useCustomerDocuments,
  useCustomerSentDocuments,
  useIsUploadingCustomerDocument,
  useUploadCustomerDocument,
} from '../hooks/use-customers'
import {
  DOCUMENT_KINDS,
  type CustomerBookingDocument,
  type CustomerDocument,
  type DocumentKind,
} from '../types/customer.types'
import { DocumentOnFile } from './DocumentOnFile'

interface Props {
  customerId: string
  /** Hides the pickers for someone who may look at a customer but not change them. */
  canEdit: boolean
}

const ACCEPT = ACCEPTED_DOCUMENT_TYPES.join(',')
const MAX_MB = MAX_DOCUMENT_BYTES / (1024 * 1024)

/**
 * A customer's licence and insurance scans: the one on file for each, or a slot to add it.
 * A picked file goes up at once, since there is no form here to save it with.
 */
export function CustomerDocuments({ customerId, canEdit }: Props) {
  const { t } = useTranslation('customers')
  const { t: tCommon } = useTranslation('common')
  const { data: documents, isLoading, isError, refetch } = useCustomerDocuments(customerId)
  // Not waited for: the file is what the card is for, and it is another request.
  const sentScans = useCustomerSentDocuments(customerId)
  const sent = sentScans.data ?? []

  if (isLoading) return <LoadingState label={t('documents.loading')} />
  if (isError || !documents) {
    return <ErrorState description={t('documents.loadError')} onRetry={() => refetch()} />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
        {DOCUMENT_KINDS.map((kind) => (
          <DocumentSlot
            key={kind}
            customerId={customerId}
            kind={kind}
            onFile={documents.find((d) => d.kind === kind && d.status === 'ready')}
            // Newest first, so this is the one from their latest reservation that finished.
            sent={sent.find((d) => d.kind === kind && d.status === 'ready')}
            canEdit={canEdit}
          />
        ))}
      </div>
      {/* Said, not left blank: a failure looked exactly like a renter who had sent nothing. */}
      {sentScans.isError && (
        <p role="alert" className="text-caption text-error m-0 flex flex-wrap items-center gap-2">
          {t('documents.sentLoadError')}
          <Button type="button" variant="outline" size="sm" onClick={() => void sentScans.refetch()}>
            {tCommon('actions.retry')}
          </Button>
        </p>
      )}
    </div>
  )
}

interface SlotProps extends Props {
  kind: DocumentKind
  onFile: CustomerDocument | undefined
  /** The scan of this kind the renter last sent with a reservation, shown while none is on file. */
  sent: CustomerBookingDocument | undefined
}

/**
 * One kind of scan. A component of its own so each has its own upload: sharing one, a second
 * upload starting made the first slot look finished while its file was still on the way.
 */
function DocumentSlot({ customerId, kind, onFile, sent, canEdit }: SlotProps) {
  const { t } = useTranslation('customers')
  const { t: tCommon } = useTranslation('common')
  const upload = useUploadCustomerDocument(customerId)
  // Read from the client, not from `upload`: this slot is unmounted when a refresh fails and
  // remade on retry, and the new one must still know its file is on the way.
  const uploading = useIsUploadingCustomerDocument(customerId, kind)
  const picker = useRef<HTMLInputElement>(null)
  const label = t(`documents.kind.${kind}`)

  function send(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast({
        title: tCommon('upload.tooLarge'),
        description: tCommon('upload.tooLargeDescription', { size: MAX_MB }),
        variant: 'error',
      })
      return
    }
    upload.mutate({ kind, file })
  }

  // One row a kind, as this field looks everywhere else: the company's copy, or else the renter's.
  const shown = onFile ?? sent

  return (
    <FormField label={label}>
      {({ id }) =>
        uploading ? (
          <p className="text-fg-3 m-0 text-[13px]">{t('documents.uploading')}</p>
        ) : shown ? (
          <>
            {/* Replace opens the picker itself: the scan stays put until another is chosen,
                so backing out of the picker needs no Cancel. On the renter's own scan it puts
                one on file, which then stands in its place. */}
            <DocumentOnFile
              customerId={customerId}
              document={shown}
              sentWith={onFile ? undefined : sent?.bookingReference}
              onReplace={canEdit ? () => picker.current?.click() : undefined}
            />
            {canEdit && (
              <input
                ref={picker}
                type="file"
                accept={ACCEPT}
                aria-label={t('documents.replace', { document: label })}
                className="hidden"
                onChange={(event) => {
                  send(event.target.files?.[0])
                  // Cleared so choosing the same file again still fires a change.
                  event.target.value = ''
                }}
              />
            )}
          </>
        ) : canEdit ? (
          <DocumentUpload
            id={id}
            label={label}
            value={null}
            onChange={(picked) => send(picked?.file)}
            accept={ACCEPT}
          />
        ) : (
          <p className="text-fg-3 m-0 text-[13px]">{t('documents.none')}</p>
        )
      }
    </FormField>
  )
}
