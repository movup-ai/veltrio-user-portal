import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FileCheck2, Send, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { RecordTable } from '@/components/data-display/RecordTable'
import type { Cell, Column, Row } from '@/components/data-display/record-table.types'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormField } from '@/components/forms/FormField'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import {
  useInsuranceLinkDialog,
  useInsuranceResults,
  useOrderStandaloneVerification,
  useStartInsurance,
  useVerificationLog,
  useVerificationReportById,
} from '@/modules/bookings/hooks/use-verification'
import { insuranceReturnUri } from '@/modules/bookings/utils/booking.insurance-redirect'
import { InsuranceLinkDialog } from '@/modules/bookings/components/InsuranceLinkDialog'
import type { InsuranceOrderWire } from '@/modules/bookings/api/booking.mapper'
import {
  blankVerificationValues,
  verificationFormSchema,
  toVerificationOrder,
  type VerificationFormValues,
} from '@/modules/bookings/schema/verification.schema'
import type { VerificationRecord } from '@/modules/bookings/types/booking.types'

/** Wide enough for any adult — the picker pages by dropdown, not month by month. */
const DOB_YEAR_RANGE = { from: new Date().getFullYear() - 100, to: new Date().getFullYear() }

/**
 * Verification as its own tool, rather than something that only happens inside a booking.
 *
 * The same Checkr check the booking form runs, on anyone: a contractor, a valet, a new hire.
 * Nothing here creates a customer — a person screened on this page is not a renter.
 */
export function VerificationPage() {
  const { t } = useTranslation('bookings')
  const { t: tValidation } = useTranslation('validation')
  const { shortDate } = useFormatters()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const log = useVerificationLog({ page, pageSize })
  const order = useOrderStandaloneVerification()
  const report = useVerificationReportById()
  const startInsurance = useStartInsurance()
  useInsuranceResults()
  const insuranceLink = useInsuranceLinkDialog()

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationFormSchema(tValidation)),
    defaultValues: blankVerificationValues(),
    mode: 'onBlur',
  })

  function onSubmit(values: VerificationFormValues) {
    order.mutate(toVerificationOrder(values), {
      // Cleared only on success: a failed check leaves the details in place to try again.
      onSuccess: () => form.reset(blankVerificationValues()),
    })
  }

  /**
   * Insurance needs only the name and date of birth, so it validates just those two rather
   * than the whole form - a half-filled address has no bearing on it.
   */
  async function insuranceOrder(): Promise<InsuranceOrderWire | undefined> {
    if (!(await form.trigger(['name', 'dateOfBirth']))) return undefined
    const { name, dateOfBirth } = form.getValues()
    return { name: name.trim(), dateOfBirth, redirectUri: insuranceReturnUri(window.location) }
  }

  async function onVerifyInsurance() {
    const input = await insuranceOrder()
    if (input) startInsurance.mutate(input)
  }

  async function onSendInsuranceLink() {
    const input = await insuranceOrder()
    if (input) insuranceLink.share(input)
  }

  const columns: Column[] = [
    { label: t('verificationPage.log.columns.person'), align: 'left' },
    { label: t('verificationPage.log.columns.kind'), align: 'left' },
    { label: t('verificationPage.log.columns.source'), align: 'left' },
    { label: t('verificationPage.log.columns.checked'), align: 'left' },
    { label: t('verificationPage.log.columns.result'), align: 'left' },
    // Unlabelled, like every other actions column in the app.
    { label: '', align: 'right' },
  ]

  function resultCell(record: VerificationRecord): Cell {
    // Reuses the shared status vocabulary rather than inventing colours: a found record reads
    // as Flagged, a clean one as Completed, whatever the module calls them internally.
    const status =
      record.status === 'clear'
        ? 'Completed'
        : record.status === 'consider'
          ? 'Flagged'
          : record.status === 'error'
            ? 'Failed'
            : 'Pending'
    return { kind: 'badge', status }
  }

  const rows: Row[] = (log.data?.items ?? []).map((record) => ({
    key: record.id,
    cells: [
      {
        kind: 'stack',
        primary: record.name,
        secondary: record.dateOfBirth ? shortDate(record.dateOfBirth) : undefined,
      },
      { kind: 'text', primary: t(`details.checks.${record.kind}`) },
      {
        kind: 'text',
        primary: record.customerId
          ? t('verificationPage.log.renter')
          : t('verificationPage.log.standalone'),
      },
      {
        kind: 'text',
        primary: record.completedAt
          ? shortDate(record.completedAt)
          : t('verificationPage.log.notRunYet'),
      },
      resultCell(record),
      {
        kind: 'actions',
        align: 'right',
        items: record.hasReport
          ? [
              {
                label: t('verificationPage.log.viewReport'),
                onClick: () => report.mutate(record.id),
              },
            ]
          : [],
      },
    ],
  }))

  return (
    <PageContainer>
      <PageHeader
        title={t('verificationPage.title')}
        description={t('verificationPage.description')}
      />

      <Card as="section" className="p-[18px]">
        <PanelHeading
          title={t('verificationPage.form.title')}
          description={t('verificationPage.form.hint')}
        />

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <FormField
              label={t('verificationPage.form.name')}
              required
              error={form.formState.errors.name?.message}
            >
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  placeholder={t('verificationPage.form.namePlaceholder')}
                  {...form.register('name')}
                />
              )}
            </FormField>

            <FormField
              label={t('verificationPage.form.dateOfBirth')}
              required
              error={form.formState.errors.dateOfBirth?.message}
            >
              {({ id, invalid }) => (
                <Controller
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <DatePicker
                      id={id}
                      invalid={invalid}
                      value={field.value}
                      onChange={field.onChange}
                      yearRange={DOB_YEAR_RANGE}
                    />
                  )}
                />
              )}
            </FormField>
          </div>

          <div className="border-border-soft border-t pt-4">
            <PanelHeading
              title={t('verificationPage.form.address')}
              description={t('verificationPage.form.addressHint')}
            />

            <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-6">
              <FormField
                label={t('verificationPage.form.street')}
                className="md:col-span-3"
                error={form.formState.errors.street?.message}
              >
                {({ id, invalid }) => (
                  <Input
                    id={id}
                    invalid={invalid}
                    placeholder={t('verificationPage.form.streetPlaceholder')}
                    {...form.register('street')}
                  />
                )}
              </FormField>

              <FormField
                label={t('verificationPage.form.city')}
                className="md:col-span-1"
                error={form.formState.errors.city?.message}
              >
                {({ id, invalid }) => (
                  <Input
                    id={id}
                    invalid={invalid}
                    placeholder={t('verificationPage.form.cityPlaceholder')}
                    {...form.register('city')}
                  />
                )}
              </FormField>

              <FormField
                label={t('verificationPage.form.state')}
                className="md:col-span-1"
                error={form.formState.errors.state?.message}
              >
                {({ id, invalid }) => (
                  <Input
                    id={id}
                    invalid={invalid}
                    maxLength={2}
                    placeholder={t('verificationPage.form.statePlaceholder')}
                    className="uppercase"
                    {...form.register('state')}
                  />
                )}
              </FormField>

              <FormField
                label={t('verificationPage.form.zip')}
                className="md:col-span-1"
                error={form.formState.errors.zipCode?.message}
              >
                {({ id, invalid }) => (
                  <Input
                    id={id}
                    invalid={invalid}
                    placeholder={t('verificationPage.form.zipPlaceholder')}
                    {...form.register('zipCode')}
                  />
                )}
              </FormField>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              loading={insuranceLink.sharing}
              onClick={onSendInsuranceLink}
              className="gap-1.5"
            >
              <Send className="size-4" aria-hidden />
              {t('insuranceLink.action')}
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={startInsurance.isPending}
              onClick={onVerifyInsurance}
              className="gap-1.5"
            >
              <FileCheck2 className="size-4" aria-hidden />
              {t('verificationPage.form.verifyInsurance')}
            </Button>
            <Button type="submit" variant="primary" loading={order.isPending} className="gap-1.5">
              <ShieldCheck className="size-4" aria-hidden />
              {t('verificationPage.form.submit')}
            </Button>
          </div>
        </form>
      </Card>

      {/* No email or phone on this form: the person is not on file, so the counter types them. */}
      <InsuranceLinkDialog {...insuranceLink.dialog} renterName={form.getValues('name').trim()} />

      <RecordTable
        title={t('verificationPage.log.title')}
        columns={columns}
        rows={rows}
        emptyState={
          log.isError ? (
            <ErrorState
              description={t('verificationPage.log.loadError')}
              onRetry={() => log.refetch()}
            />
          ) : (
            t('verificationPage.log.empty')
          )
        }
        pagination={{
          page,
          pageSize,
          total: log.data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
      />
    </PageContainer>
  )
}
