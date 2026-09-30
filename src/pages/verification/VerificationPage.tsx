import { useState, type FormEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { CalendarRange, Send, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import {
  DateRangePicker,
  EMPTY_DATE_RANGE,
  fromDateValue,
  type DateRange,
} from '@/components/ui/date-range-picker'
import { Input } from '@/components/ui/input'
import { RecordTable } from '@/components/data-display/RecordTable'
import type { Cell, Column, Row } from '@/components/data-display/record-table.types'
import { usePermissions } from '@/components/feedback/Can'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FormField } from '@/components/forms/FormField'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import {
  useDeleteVerification,
  useInsuranceLinkDialog,
  useInsuranceResults,
  useOrderStandaloneVerification,
  useVerificationLog,
  useVerificationReportById,
} from '@/modules/bookings/hooks/use-verification'
import { insuranceReturnUri } from '@/modules/bookings/utils/booking.insurance-redirect'
import {
  logActions,
  resendInsuranceOrder,
  type LogAction,
} from '@/modules/bookings/utils/booking.verification'
import { hasPermission } from '@/utils/permissions'
import { CheckKindPicker } from '@/modules/bookings/components/CheckKindPicker'
import { InsuranceLinkDialog } from '@/modules/bookings/components/InsuranceLinkDialog'
import type { StandaloneCheck } from '@/modules/bookings/constants/verification.constants'
import type { InsuranceOrderWire } from '@/modules/bookings/api/booking.mapper'
import {
  blankVerificationValues,
  verificationFormSchema,
  toVerificationOrder,
  type VerificationFormValues,
} from '@/modules/bookings/schema/verification.schema'
import {
  isProviderKind,
  type VerificationRecord,
} from '@/modules/bookings/types/booking.types'

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
  const { date: formatDate, shortDate } = useFormatters()
  const [kind, setKind] = useState<StandaloneCheck>('background')
  // Insurance only: the days the cover has to span. Blank checks that a policy is in force today.
  const [cover, setCover] = useState<DateRange>(EMPTY_DATE_RANGE)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const log = useVerificationLog({ page, pageSize })
  const order = useOrderStandaloneVerification()
  const report = useVerificationReportById()
  useInsuranceResults()
  const insuranceLink = useInsuranceLinkDialog()
  // Who the open link dialog is for: the person in the form, or a row of the history.
  const [linkFor, setLinkFor] = useState<{ name: string; email?: string }>({ name: '' })
  const canDelete = hasPermission(usePermissions(), 'verifications.delete')
  const removal = useDeleteVerification()
  const [deleting, setDeleting] = useState<VerificationRecord>()

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
    return {
      name: name.trim(),
      dateOfBirth,
      coversFrom: cover.from || undefined,
      coversThrough: cover.to || cover.from || undefined,
      redirectUri: insuranceReturnUri(window.location),
    }
  }

  function coverLabel({ from, to }: DateRange): string {
    const start = fromDateValue(from)
    if (!start) return t('verificationPage.form.coverToday')
    const end = fromDateValue(to)
    return end && to !== from ? `${shortDate(start)} – ${shortDate(end)}` : shortDate(start)
  }

  async function onSendInsuranceLink() {
    const input = await insuranceOrder()
    if (!input) return
    setLinkFor({ name: input.name })
    insuranceLink.share(input)
  }

  function resend(record: VerificationRecord) {
    const input = resendInsuranceOrder(record, insuranceReturnUri(window.location))
    if (!input) return
    setLinkFor({ name: record.name, email: record.email })
    insuranceLink.share(input)
  }

  const actionFor: Record<LogAction, { label: string; run: (record: VerificationRecord) => void }> =
    {
      viewReport: { label: t('verificationPage.log.viewReport'), run: (r) => report.open(r.id) },
      sendLink: { label: t('insuranceLink.action'), run: resend },
      sendNewLink: { label: t('insuranceLink.actionNew'), run: resend },
      delete: { label: t('verificationPage.log.delete'), run: setDeleting },
    }

  function actionsCell(record: VerificationRecord): Cell {
    const actions = logActions(record, canDelete)
    // No menu at all rather than one that opens empty.
    if (actions.length === 0) return { kind: 'text', primary: '' }
    return {
      kind: 'actions',
      align: 'right',
      items: actions.map((action) => ({
        label: actionFor[action].label,
        onClick: () => actionFor[action].run(record),
        destructive: action === 'delete',
      })),
    }
  }

  // One submit for both, so Enter in a field runs the check that is picked, not always Checkr.
  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (kind === 'background') return form.handleSubmit(onSubmit)(event)
    event.preventDefault()
    void onSendInsuranceLink()
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

  function checkedCell(record: VerificationRecord): Cell {
    if (!record.completedAt) {
      return {
        kind: 'stack',
        primary: t('verificationPage.log.inProgress'),
        secondary: t('verificationPage.log.startedOn', { when: shortDate(record.createdAt) }),
        weight: 400,
      }
    }
    return {
      kind: 'stack',
      primary: formatDate(record.completedAt, { month: 'short', day: 'numeric', year: 'numeric' }),
      secondary: formatDate(record.completedAt, { hour: 'numeric', minute: '2-digit' }),
      weight: 400,
    }
  }

  function resultCell(record: VerificationRecord): Cell {
    // The shared colours, so a found record reads as Flagged does everywhere, but the check's
    // own words: "Covered" and "Needs review" say more than "Completed" and "Flagged".
    const status =
      record.status === 'clear'
        ? 'Completed'
        : record.status === 'consider'
          ? 'Flagged'
          : record.status === 'error'
            ? 'Failed'
            : 'Pending'
    const label = isProviderKind(record.kind)
      ? t(`verification.state.${record.kind}.${record.status}`)
      : undefined
    return { kind: 'badge', status, label }
  }

  const rows: Row[] = (log.data?.items ?? []).map((record) => ({
    key: record.id,
    cells: [
      // The email tells two renters of the same name apart; a birth date need not be on show.
      { kind: 'stack', primary: record.name, secondary: record.email },
      { kind: 'text', primary: t(`details.checks.${record.kind}`) },
      {
        kind: 'text',
        primary: record.customerId
          ? t('verificationPage.log.renter')
          : t('verificationPage.log.standalone'),
      },
      checkedCell(record),
      resultCell(record),
      actionsCell(record),
    ],
  }))

  return (
    <PageContainer>
      <PageHeader
        title={t('verificationPage.title')}
        description={t('verificationPage.description')}
      />

      <Card as="section" className="overflow-hidden">
        <div className="p-[18px]">
          <PanelHeading
            title={t('verificationPage.runCheck')}
            description={t('verificationPage.form.hint')}
          />
          <div className="mt-4">
            <CheckKindPicker value={kind} onChange={setKind} />
          </div>
        </div>

        <form onSubmit={onFormSubmit} className="border-border-soft border-t" noValidate>
          <div className="flex flex-col gap-4 p-[18px]">
            <PanelHeading title={t('verificationPage.form.title')} />
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

            {kind === 'background' && (
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
            )}

            {kind === 'insurance' && (
              <div className="border-border-soft border-t pt-4">
                <FormField
                  label={t('verificationPage.form.coverNeeded')}
                  description={t('verificationPage.form.coverHint')}
                  className="md:max-w-[340px]"
                >
                  {({ id, 'aria-describedby': describedBy }) => (
                    <DateRangePicker
                      value={cover}
                      onChange={setCover}
                      trigger={
                        <Button
                          id={id}
                          aria-describedby={describedBy}
                          type="button"
                          variant="outline"
                          className="w-full justify-between font-normal"
                        >
                          {coverLabel(cover)}
                          <CalendarRange className="size-4 opacity-50" aria-hidden />
                        </Button>
                      }
                    />
                  )}
                </FormField>
              </div>
            )}
          </div>

          {/* One action, for the check that is picked, with what happens next beside it. */}
          <div className="border-border-soft bg-surface-2 flex flex-wrap items-center justify-between gap-3 border-t px-[18px] py-3">
            <p className="text-fg-4 m-0 text-[12.5px]">{t(`verificationPage.form.next.${kind}`)}</p>
            <Button
              type="submit"
              variant="primary"
              loading={kind === 'background' ? order.isPending : insuranceLink.sharing}
              className="gap-1.5"
            >
              {kind === 'background' ? (
                <ShieldCheck className="size-4" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {kind === 'background'
                ? t('verificationPage.form.submit')
                : t('verificationPage.form.createLink')}
            </Button>
          </div>
        </form>
      </Card>

      {/* A renter's row brings their email; someone from the form is typed in by the counter. */}
      <InsuranceLinkDialog
        {...insuranceLink.dialog}
        renterName={linkFor.name}
        defaultEmail={linkFor.email}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={t('verificationPage.log.deleteTitle')}
        description={
          deleting &&
          t('verificationPage.log.deleteDescription', {
            check: t(`details.checks.${deleting.kind}`).toLowerCase(),
            name: deleting.name,
          })
        }
        confirmLabel={t('verificationPage.log.delete')}
        loading={removal.isPending}
        onConfirm={() =>
          deleting && removal.mutate(deleting.id, { onSettled: () => setDeleting(undefined) })
        }
      />

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
