import { useEffect, useState } from 'react'
import { BellOff, CheckCheck, Filter, Megaphone, Settings, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Pagination } from '@/components/data-display/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEFAULT_PAGE_SIZE, pageBackTo } from '@/lib/pagination'
import { cn } from '@/lib/utils'
import { AnnouncementRows, NotificationRows } from '@/modules/notifications/components/NotificationLists'
import { KEPT_FOR_DAYS } from '@/modules/notifications/constants/notifications.constants'
import {
  useAnnouncements,
  useReadShownAnnouncements,
  useMarkOpened,
  useMarkRead,
  useNotificationPage,
  useUnreadCount,
} from '@/modules/notifications/hooks/use-notifications'
import type { NotificationCategory } from '@/modules/notifications/types/notifications.types'
import {
  NOTIFICATION_SETTINGS_PATH,
  categoriesFor,
  emptyNotifications,
  type EmptyNotifications,
} from '@/modules/notifications/utils/notifications.utils'
import { useOrganizationStore } from '@/state/organization.store'
import type { PaginatedResult } from '@/types/common'

const TABS = ['all', 'unread', 'whatsNew'] as const
type Tab = (typeof TABS)[number]
const ANY = 'any'

/** Every notification of the last 90 days, and everything Veltrio has announced. */
export function NotificationsPage() {
  const { t } = useTranslation('notifications')
  const navigate = useNavigate()
  const role = useOrganizationStore((state) => state.membership?.role)
  const [tab, setTab] = useState<Tab>('all')
  const [category, setCategory] = useState<NotificationCategory | undefined>()
  const [page, setPage] = useState(1)
  const counts = useUnreadCount().data
  const markRead = useMarkRead()

  const choose = (next: () => void) => {
    next()
    setPage(1)
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('page.title')}
        description={t('page.description', { days: KEPT_FOR_DAYS })}
        actions={
          <>
            <PageActionButton
              icon={CheckCheck}
              label={t('page.markAllRead')}
              disabled={!counts?.notifications || markRead.isPending}
              onClick={() => markRead.mutate({ all: true })}
            />
            <PageActionButton
              icon={Settings}
              label={t('page.emailSettings')}
              onClick={() => navigate(NOTIFICATION_SETTINGS_PATH)}
            />
          </>
        }
      />

      <div className="flex max-w-[1240px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(value) => choose(() => setTab(value as Tab))}>
            <TabsList>
              {TABS.map((key) => (
                <TabsTrigger key={key} value={key}>
                  {t(`page.tabs.${key}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {tab !== 'whatsNew' && (
            <Select
              value={category ?? ANY}
              onValueChange={(value) =>
                choose(() => setCategory(value === ANY ? undefined : (value as NotificationCategory)))
              }
            >
              <SelectTrigger aria-label={t('page.category')} className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t('page.allCategories')}</SelectItem>
                {categoriesFor(role).map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`categories.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {tab === 'whatsNew' ? (
          <AnnouncementList page={page} onPageChange={setPage} />
        ) : (
          <NotificationList
            unread={tab === 'unread'}
            category={category}
            page={page}
            onPageChange={setPage}
            onShowAll={() => choose(() => setTab('all'))}
            onClearCategory={() => choose(() => setCategory(undefined))}
          />
        )}
      </div>
    </PageContainer>
  )
}

interface ListProps {
  page: number
  onPageChange: (page: number) => void
}

interface NotificationListProps extends ListProps {
  unread: boolean
  category?: NotificationCategory
  onShowAll: () => void
  onClearCategory: () => void
}

function NotificationList({
  unread,
  category,
  page,
  onPageChange,
  onShowAll,
  onClearCategory,
}: NotificationListProps) {
  const { t } = useTranslation('notifications')
  const { data, isLoading, isError, refetch, isStale, dataUpdatedAt } = useNotificationPage({
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    unread,
    category,
  })
  const markOpened = useMarkOpened()
  const now = dataUpdatedAt

  const movingBack = useBackToRows(page, data, onPageChange)

  if (isLoading || movingBack) return <LoadingState />
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />
  if (data.items.length === 0) {
    const empty = emptyNotifications({ unread, category })
    const action =
      empty === 'category' ? (
        <Button variant="outline" size="sm" onClick={onClearCategory}>
          {t('page.empty.clearCategory')}
        </Button>
      ) : empty === 'caughtUp' ? (
        <Button variant="outline" size="sm" onClick={onShowAll}>
          {t('page.empty.showAll')}
        </Button>
      ) : undefined
    return (
      <EmptyCard
        icon={EMPTY_ICONS[empty]}
        title={t(`page.empty.${empty}.title`, { category: category ? t(`categories.${category}`) : '' })}
        description={t(`page.empty.${empty}.description`)}
        action={action}
      />
    )
  }
  return (
    <PagedCard stale={isStale} page={data.page} totalPages={data.totalPages} onPageChange={onPageChange}>
      <NotificationRows notifications={data.items} now={now} onOpen={markOpened} />
    </PagedCard>
  )
}

function AnnouncementList({ page, onPageChange }: ListProps) {
  const { t } = useTranslation('notifications')
  const { data, isLoading, isError, refetch, isStale } = useAnnouncements({
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  useReadShownAnnouncements(data?.items)
  const movingBack = useBackToRows(page, data, onPageChange)

  if (isLoading || movingBack) return <LoadingState />
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />
  if (data.items.length === 0) {
    return (
      <EmptyCard
        icon={Megaphone}
        title={t('page.empty.announcements.title')}
        description={t('page.empty.announcements.description')}
      />
    )
  }
  return (
    <PagedCard stale={isStale} page={data.page} totalPages={data.totalPages} onPageChange={onPageChange}>
      <AnnouncementRows announcements={data.items} />
    </PagedCard>
  )
}

const EMPTY_ICONS: Record<EmptyNotifications, LucideIcon> = {
  none: BellOff,
  caughtUp: CheckCheck,
  category: Filter,
}

/** Inside a card, like the list it stands in for, rather than a dashed box floating on the page. */
function EmptyCard(props: React.ComponentProps<typeof EmptyState>) {
  return (
    <Card>
      <EmptyState {...props} className="border-0 py-14" />
    </Card>
  )
}

/** Dimmed while the next page loads: the rows on screen belong to the previous tab or page. */
function PagedCard({
  stale,
  page,
  totalPages,
  onPageChange,
  children,
}: {
  stale: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  children: React.ReactNode
}) {
  return (
    <>
      <Card className={cn('overflow-hidden transition-opacity', stale && 'pointer-events-none opacity-60')}>
        {children}
      </Card>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />}
    </>
  )
}

/** Moves back a page when the one shown has emptied under it; true until it has. */
function useBackToRows<T>(
  page: number,
  data: PaginatedResult<T> | undefined,
  onPageChange: (page: number) => void,
) {
  const back = data ? pageBackTo(page, data) : undefined
  useEffect(() => {
    if (back !== undefined) onPageChange(back)
  }, [back, onPageChange])
  return back !== undefined
}
