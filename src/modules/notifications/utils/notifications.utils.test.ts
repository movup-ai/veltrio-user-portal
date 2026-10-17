import { describe, expect, it } from 'vitest'
import { toAnnouncement, toNotification } from '../api/notifications.mapper'
import type { Announcement, Notification } from '../types/notifications.types'
import {
  announcementText,
  badgeLabel,
  bannerAnnouncement,
  categoriesFor,
  emptyNotifications,
  notificationKey,
  notificationLink,
  notificationValues,
  relativeTime,
  unreadAnnouncementIds,
} from './notifications.utils'

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    kind: 'payment_received',
    category: 'payments',
    entityType: 'booking',
    entityId: 'b-1',
    params: { reference: 'BK-10234', customer: 'Dana Okafor', amountCents: 23_540 },
    createdAt: '2026-10-17T12:00:00Z',
    ...overrides,
  }
}

function announcement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'a-1',
    kind: 'release',
    title: { en: 'Calendar view' },
    body: { en: 'See every booking.' },
    publishAt: '2026-10-17T12:00:00Z',
    attachments: [],
    read: false,
    dismissed: false,
    ...overrides,
  }
}

const word = { money: (cents: number) => `$${cents / 100}`, role: (role: string) => `<${role}>` }

describe('notificationKey', () => {
  it('names the text for a kind it knows', () => {
    expect(notificationKey('booking_requested')).toBe('kinds.booking_requested')
  })

  it('falls back for a kind from a newer API, rather than showing the slug', () => {
    expect(notificationKey('fleet_on_fire')).toBe('kinds.unknown')
  })
})

describe('notificationValues', () => {
  it('words the amount from cents, and keeps the rest as sent', () => {
    expect(notificationValues(notification(), word)).toEqual({
      reference: 'BK-10234',
      customer: 'Dana Okafor',
      amountCents: '23540',
      amount: '$235.4',
    })
  })

  it('words a role, and drops values that are not text', () => {
    const joined = notification({ params: { member: 'Jo Rivera', role: 'manager', extra: { nested: 1 } } })

    expect(notificationValues(joined, word)).toMatchObject({
      member: 'Jo Rivera',
      role: '<manager>',
      extra: '',
    })
  })
})

describe('notificationLink', () => {
  it('opens a booking by its reference, as the bookings pages do', () => {
    expect(notificationLink(notification())).toBe('/bookings/BK-10234')
  })

  it('opens a ticket by its id, the team for an invitation, billing for the company', () => {
    expect(notificationLink(notification({ entityType: 'support_ticket', entityId: 't-9' }))).toBe(
      '/support/t-9',
    )
    expect(notificationLink(notification({ entityType: 'invitation' }))).toBe('/users')
    expect(notificationLink(notification({ entityType: 'tenant' }))).toBe('/settings/billing')
  })

  it('has nowhere to go for a booking it cannot name', () => {
    expect(notificationLink(notification({ params: {} }))).toBeUndefined()
  })
})

describe('relativeTime', () => {
  const now = Date.parse('2026-10-17T12:00:00Z')

  it('counts minutes, hours and days back', () => {
    expect(relativeTime('2026-10-17T11:59:40Z', now, 'en-US')).toBe('this minute')
    expect(relativeTime('2026-10-17T11:55:00Z', now, 'en-US')).toBe('5 minutes ago')
    expect(relativeTime('2026-10-17T09:00:00Z', now, 'en-US')).toBe('3 hours ago')
    expect(relativeTime('2026-10-16T11:00:00Z', now, 'en-US')).toBe('yesterday')
    expect(relativeTime('2026-10-16T11:00:00Z', now, 'es-ES')).toBe('ayer')
  })

  it('gives up after a week, where the date reads better', () => {
    expect(relativeTime('2026-10-10T12:00:00Z', now, 'en-US')).toBeUndefined()
  })
})

describe('emptyNotifications', () => {
  it('names the filter that emptied the list before the tab, so clearing it is what is offered', () => {
    expect(emptyNotifications({ unread: true, category: 'payments' })).toBe('category')
    expect(emptyNotifications({ unread: true })).toBe('caughtUp')
    expect(emptyNotifications({ unread: false })).toBe('none')
  })
})

describe('categoriesFor', () => {
  it('offers billing to owners only: nobody else ever has a billing notification', () => {
    expect(categoriesFor('owner')).toContain('billing')
    expect(categoriesFor('manager')).not.toContain('billing')
    expect(categoriesFor('staff')).toEqual(['bookings', 'payments', 'contracts', 'support', 'team'])
  })
})

describe('announcements', () => {
  it('reads in Spanish only when Veltrio wrote it in Spanish', () => {
    const both = announcement({
      title: { en: 'Calendar', es: 'Calendario' },
      body: { en: 'All.', es: 'Todo.' },
    })

    expect(announcementText(both, 'es')).toEqual({ title: 'Calendario', body: 'Todo.' })
    expect(announcementText(both, 'en')).toEqual({ title: 'Calendar', body: 'All.' })
    expect(announcementText(announcement(), 'es')).toEqual({
      title: 'Calendar view',
      body: 'See every booking.',
    })
  })

  it('banners the newest maintenance notice not yet dismissed', () => {
    const list = [
      announcement({ id: 'release' }),
      announcement({ id: 'dismissed', kind: 'maintenance', dismissed: true }),
      announcement({ id: 'current', kind: 'maintenance' }),
    ]

    expect(bannerAnnouncement(list)?.id).toBe('current')
    expect(bannerAnnouncement([announcement()])).toBeUndefined()
  })

  it('lists the unread ones to mark', () => {
    expect(unreadAnnouncementIds([announcement({ id: 'x' }), announcement({ id: 'y', read: true })])).toEqual(
      ['x'],
    )
  })
})

describe('badgeLabel', () => {
  it('shows nothing at zero and stops counting past nine', () => {
    expect(badgeLabel(0)).toBeUndefined()
    expect(badgeLabel(3)).toBe('3')
    expect(badgeLabel(12)).toBe('9+')
  })
})

describe('mapper', () => {
  it('turns the wire nulls into absent fields', () => {
    const read = toNotification({ ...notification(), readAt: null })
    expect(read.readAt).toBeUndefined()

    const mapped = toAnnouncement({
      id: 'a',
      kind: 'notice',
      titleEn: 'Hi',
      bodyEn: 'There',
      titleEs: null,
      bodyEs: null,
      linkUrl: null,
      publishAt: '2026-10-17T12:00:00Z',
      attachments: [],
      read: true,
      dismissed: false,
    })
    expect(mapped).toMatchObject({ title: { en: 'Hi', es: undefined }, linkUrl: undefined })
  })
})
