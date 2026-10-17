import { useState } from 'react'
import { Bell, BellOff, Megaphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BELL_PAGE } from '../constants/notifications.constants'
import {
  useAnnouncements,
  useReadShownAnnouncements,
  useMarkOpened,
  useMarkRead,
  useNotificationPage,
  useUnreadCount,
} from '../hooks/use-notifications'
import type { Notification } from '../types/notifications.types'
import { NOTIFICATIONS_PATH, badgeLabel } from '../utils/notifications.utils'
import { AnnouncementRows, NotificationRows } from './NotificationLists'

type BellTab = 'notifications' | 'whatsNew'

const ANNOUNCEMENTS_SHOWN = { page: 1, pageSize: 5 }

/** The header's bell: the latest notifications and Veltrio's news, a click from anywhere. */
export function NotificationBell() {
  const { t } = useTranslation('notifications')
  const { t: tNav } = useTranslation('nav')
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<BellTab>('notifications')
  const counts = useUnreadCount().data
  const unread = (counts?.notifications ?? 0) + (counts?.announcements ?? 0)
  const badge = badgeLabel(unread)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={tNav('header.notifications', { count: unread })}
          className="bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground relative flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border transition-colors"
        >
          <Bell className="size-4" />
          {badge && (
            <span className="bg-error border-background text-surface absolute -top-[3px] -right-[3px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 px-[3px] text-[9.5px] font-bold">
              {badge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="flex w-[380px] max-w-[calc(100vw-24px)] flex-col p-0"
      >
        <Tabs value={tab} onValueChange={(value) => setTab(value as BellTab)}>
          <div className="border-border-soft flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <TabsList>
              <TabsTrigger value="notifications">
                {t('bell.tabs.notifications')}
                {counts && counts.notifications > 0 && <Count value={counts.notifications} />}
              </TabsTrigger>
              <TabsTrigger value="whatsNew">
                {t('bell.tabs.whatsNew')}
                {counts && counts.announcements > 0 && <Count value={counts.announcements} />}
              </TabsTrigger>
            </TabsList>
            {tab === 'notifications' && <MarkAllRead disabled={!counts?.notifications} />}
          </div>
          <div className="vx-scroll max-h-[min(440px,60vh)] overflow-y-auto">
            {open && tab === 'notifications' && <LatestNotifications onOpened={() => setOpen(false)} />}
            {open && tab === 'whatsNew' && <LatestAnnouncements />}
          </div>
        </Tabs>
        <div className="border-border-soft border-t px-3 py-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to={NOTIFICATIONS_PATH} onClick={() => setOpen(false)}>
              {t('bell.viewAll')}
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Count({ value }: { value: number }) {
  return (
    <span className="bg-primary-solid text-solid-foreground ml-1.5 rounded-full px-1.5 text-[10.5px] font-bold">
      {badgeLabel(value)}
    </span>
  )
}

function MarkAllRead({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation('notifications')
  const markRead = useMarkRead()
  return (
    <Button
      variant="link"
      size="sm"
      className="h-auto px-1"
      disabled={disabled || markRead.isPending}
      onClick={() => markRead.mutate({ all: true })}
    >
      {t('bell.markAllRead')}
    </Button>
  )
}

function LatestNotifications({ onOpened }: { onOpened: () => void }) {
  const { t } = useTranslation('notifications')
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useNotificationPage(BELL_PAGE)
  const markOpened = useMarkOpened()
  // Times are counted from when the list arrived: rendering cannot read the clock.
  const now = dataUpdatedAt

  if (isLoading) return <LoadingState hideLabel className="py-10" />
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} className="m-3 border-0 py-8" />
  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title={t('bell.emptyTitle')}
        description={t('bell.emptyDescription')}
        className="m-3 border-0 py-10"
      />
    )
  }
  const open = (notification: Notification) => {
    markOpened(notification)
    onOpened()
  }
  return <NotificationRows notifications={data.items} now={now} onOpen={open} />
}

function LatestAnnouncements() {
  const { t } = useTranslation('notifications')
  const { data, isLoading, isError, refetch } = useAnnouncements(ANNOUNCEMENTS_SHOWN)
  useReadShownAnnouncements(data?.items)

  if (isLoading) return <LoadingState hideLabel className="py-10" />
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} className="m-3 border-0 py-8" />
  if (data.items.length === 0) {
    return <EmptyState icon={Megaphone} title={t('bell.noAnnouncements')} className="m-3 border-0 py-10" />
  }
  return <AnnouncementRows announcements={data.items} />
}
