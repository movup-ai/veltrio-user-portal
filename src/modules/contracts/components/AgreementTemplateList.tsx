import { useState } from 'react'
import { FileText, MoreVertical, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFormatters } from '@/i18n'
import {
  useAgreementTemplates,
  useDeleteAgreementTemplate,
  useMakeDefaultAgreementTemplate,
} from '../hooks/use-agreement-templates'
import type { AgreementTemplateSummary } from '../types/agreement-template.types'
import { agreementTemplatePath } from '../utils/agreement-template.utils'

export function AgreementTemplateList() {
  const { t } = useTranslation('contracts')
  const { data: templates, isLoading, isError, refetch } = useAgreementTemplates()
  const makeDefault = useMakeDefaultAgreementTemplate()
  const remove = useDeleteAgreementTemplate()
  const [deleting, setDeleting] = useState<AgreementTemplateSummary>()

  return (
    <Card as="section" className="overflow-hidden">
      {isLoading ? (
        <LoadingState />
      ) : isError || !templates ? (
        <ErrorState className="m-[18px]" onRetry={() => void refetch()} />
      ) : (
        <ul className="divide-border-soft m-0 list-none divide-y p-0">
          {templates.map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              onMakeDefault={() => makeDefault.mutate(template.id)}
              onDelete={() => setDeleting(template)}
            />
          ))}
        </ul>
      )}

      <p className="border-border-soft bg-surface-2 text-fg-4 m-0 border-t px-[18px] py-3 text-[12.5px]">
        {t('agreements.legalNote')}
      </p>

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={t('agreements.confirmDelete.title', { name: deleting?.name })}
        description={t('agreements.confirmDelete.description')}
        confirmLabel={t('agreements.confirmDelete.confirm')}
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSettled: () => setDeleting(undefined) })}
      />
    </Card>
  )
}

interface TemplateRowProps {
  template: AgreementTemplateSummary
  onMakeDefault: () => void
  onDelete: () => void
}

function TemplateRow({ template, onMakeDefault, onDelete }: TemplateRowProps) {
  const { t } = useTranslation('contracts')
  const format = useFormatters()
  const navigate = useNavigate()
  const path = agreementTemplatePath(template.id)

  return (
    <li className="flex items-center gap-3 px-[18px] py-3">
      <span className="bg-surface-3 text-fg-2 flex size-9 shrink-0 items-center justify-center rounded-[10px]">
        <FileText className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link to={path} className="truncate text-[14px] font-semibold hover:underline">
            {template.name}
          </Link>
          {template.isDefault && (
            <span
              className="bg-tint text-primary inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
              title={t('agreements.defaultHint')}
            >
              <Star className="size-3" aria-hidden />
              {t('agreements.default')}
            </span>
          )}
        </div>
        <p className="text-fg-4 m-0 mt-[3px] text-[12.5px]">
          {t('agreements.meta', {
            revision: template.revision,
            date: format.date(template.updatedAt, { month: 'short', day: 'numeric', year: 'numeric' }),
          })}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={t('agreements.actions', { name: template.name })}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(path)}>{t('agreements.edit')}</DropdownMenuItem>
          {/* The default can only be moved, never removed: a booking with no template falls back to it. */}
          {!template.isDefault && (
            <>
              <DropdownMenuItem onClick={onMakeDefault}>{t('agreements.makeDefault')}</DropdownMenuItem>
              <DropdownMenuItem className="text-error focus:text-error" onClick={onDelete}>
                {t('agreements.delete')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
