import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentUpload } from '@/components/forms/DocumentUpload'
import { FormField } from '@/components/forms/FormField'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { toast } from '@/components/ui/use-toast'
import { ACCEPTED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '../api/customer-document.api'
import { useCustomerDocuments, useUploadCustomerDocument } from '../hooks/use-customers'
import { DOCUMENT_KINDS, type DocumentKind } from '../types/customer.types'
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
  const upload = useUploadCustomerDocument(customerId)
  const pickers = useRef<Partial<Record<DocumentKind, HTMLInputElement | null>>>({})

  if (isLoading) return <LoadingState label={t('documents.loading')} />
  if (isError || !documents) {
    return <ErrorState description={t('documents.loadError')} onRetry={() => refetch()} />
  }

  function replace(kind: DocumentKind, file: File | undefined) {
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

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
      {DOCUMENT_KINDS.map((kind) => {
        const label = t(`documents.kind.${kind}`)
        const onFile = documents.find((d) => d.kind === kind && d.status === 'ready')
        const uploading = upload.isPending && upload.variables.kind === kind
        return (
          <FormField key={kind} label={label}>
            {({ id }) =>
              uploading ? (
                <p className="text-fg-3 m-0 text-[13px]">{t('documents.uploading')}</p>
              ) : onFile ? (
                <>
                  {/* Replace opens the picker itself: the scan stays put until another is
                      chosen, so backing out of the picker needs no Cancel. */}
                  <DocumentOnFile
                    customerId={customerId}
                    document={onFile}
                    onReplace={() => pickers.current[kind]?.click()}
                  />
                  {canEdit && (
                    <input
                      ref={(node) => {
                        pickers.current[kind] = node
                      }}
                      type="file"
                      accept={ACCEPT}
                      aria-label={t('documents.replace', { document: label })}
                      className="hidden"
                      onChange={(event) => {
                        replace(kind, event.target.files?.[0])
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
                  onChange={(picked) => picked && upload.mutate({ kind, file: picked.file })}
                  accept={ACCEPT}
                />
              ) : (
                <p className="text-fg-3 m-0 text-[13px]">{t('documents.none')}</p>
              )
            }
          </FormField>
        )
      })}
    </div>
  )
}
