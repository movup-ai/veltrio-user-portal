import { useState } from 'react'
import { ArrowLeft, Pencil, TriangleAlert } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Can, usePermissions } from '@/components/feedback/Can'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { usePageBreadcrumb } from '@/components/navigation/usePageBreadcrumb'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFormatters } from '@/i18n'
import { CustomerBookings } from '@/modules/customers/components/CustomerBookings'
import { CustomerDocuments } from '@/modules/customers/components/CustomerDocuments'
import { CustomerFormDialog } from '@/modules/customers/components/CustomerFormDialog'
import { CustomerOnFile } from '@/modules/customers/components/CustomerOnFile'
import { MergeCustomerDialog } from '@/modules/customers/components/MergeCustomerDialog'
import { DAY_FORMAT } from '@/modules/customers/constants/customer.constants'
import { useCustomer } from '@/modules/customers/hooks/use-customers'
import type { Customer } from '@/modules/customers/types/customer.types'
import { hasAnyPermission } from '@/utils/permissions'

export function CustomerDetailsPage() {
  const { t } = useTranslation('customers')
  const format = useFormatters()
  const navigate = useNavigate()
  const { customerId } = useParams()
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)
  const [editing, setEditing] = useState(false)
  const [merging, setMerging] = useState<Customer>()
  const canEdit = hasAnyPermission(usePermissions(), ['customers.update'])
  usePageBreadcrumb(customer?.name)

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('details.loading')} />
      </PageContainer>
    )
  }
  if (isError || !customer) {
    return (
      <PageContainer>
        <ErrorState description={t('details.loadError')} onRetry={() => refetch()} />
      </PageContainer>
    )
  }

  const day = (value: string | undefined) =>
    value ? format.date(`${value}T00:00:00`, DAY_FORMAT) : t('details.notSet')
  const facts = [
    [t('form.name'), customer.name],
    [t('form.email'), customer.email],
    [t('form.phone'), customer.phone],
    [t('form.gender'), customer.gender ? t(`gender.${customer.gender}`) : t('details.notSet')],
    [t('form.dateOfBirth'), day(customer.dateOfBirth)],
    [t('form.address'), customer.address ?? t('details.notSet')],
    [t('form.licenceNumber'), customer.licenceNumber],
    [t('form.licenceExpiry'), day(customer.licenceExpiry)],
    [t('columns.rentals'), String(customer.rentals)],
    [t('columns.lifetimeValue'), format.currency(customer.lifetimeValue)],
  ]

  return (
    <PageContainer>
      <PageHeader
        leading={
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/customers')}
            aria-label={t('details.backToList')}
          >
            <ArrowLeft className="size-4" />
          </Button>
        }
        title={customer.name}
        description={t('details.description')}
        actions={
          <Can permission="customers.update">
            <PageActionButton icon={Pencil} label={t('details.edit')} onClick={() => setEditing(true)} />
          </Can>
        }
      />

      {customer.duplicates.length > 0 && (
        // Tinted like a pending booking's banner: something to settle, not something broken.
        <section className="bg-warning-tint border-warning/25 flex flex-col gap-3 rounded-xl border px-[18px] py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="bg-surface text-warning flex size-8 shrink-0 items-center justify-center rounded-[9px]">
              <TriangleAlert className="size-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-panel-title m-0">{t('details.duplicatesTitle')}</h2>
              <p className="text-fg-3 m-0 text-[12px]">{t('details.duplicatesDescription')}</p>
            </div>
          </div>
          {customer.duplicates.map(({ customer: duplicate, reasons }) => (
            <div key={duplicate.id} className="bg-surface rounded-md">
              <CustomerOnFile
                customer={duplicate}
                reasons={reasons}
                action={
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/customers/${duplicate.id}`)}
                    >
                      {t('form.openCustomer')}
                    </Button>
                    <Can permission="customers.merge">
                      <Button size="sm" onClick={() => setMerging(duplicate)}>
                        {t('details.merge')}
                      </Button>
                    </Can>
                  </div>
                }
              />
            </div>
          ))}
        </section>
      )}

      <Card as="section" className="p-[18px]">
        <PanelHeading title={t('details.profileTitle')} />
        <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-fg-3 text-[13px]">{label}</dt>
              <dd className="m-0 mt-0.5 text-[15px] font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card as="section" className="p-[18px]">
        <PanelHeading title={t('documents.title')} description={t('documents.description')} />
        <div className="mt-4">
          <CustomerDocuments customerId={customer.id} canEdit={canEdit} />
        </div>
      </Card>

      <CustomerBookings customerId={customer.id} />

      <CustomerFormDialog customer={customer} open={editing} onOpenChange={setEditing} />
      <MergeCustomerDialog
        customer={customer}
        duplicate={merging}
        onClose={() => setMerging(undefined)}
        onMerged={(keptId) => navigate(`/customers/${keptId}`, { replace: true })}
      />
    </PageContainer>
  )
}
