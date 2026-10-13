import type { TFunction } from 'i18next'
import {
  CANCEL_REASONS,
  DECLINE_REASONS,
  FUEL_LEVELS,
  type BookingActivityEvent,
  type CancelReason,
  type DeclineReason,
} from '../types/booking.types'

/** The actions the API logs on a booking that this portal has words for. */
export const ACTIVITY_KINDS = [
  'created',
  'confirmed',
  'declined',
  'restored',
  'cancelled',
  'renter_settled',
  'dates_changed',
  'vehicle_swapped',
  'drivers_changed',
  'extended',
  'extension_requested',
  'extension_cancelled',
  'extension_accepted',
  'picked_up',
  'returned',
  'closed',
  'payment_link_created',
  'payment_link_shared',
  'deposit_requested',
  'deposit_link_shared',
  'payment_recorded',
  'payment_received',
  'payment_processing',
  'payment_failed',
  'deposit_held',
  'deposit_lapsed',
  'deposit_captured',
  'deposit_released',
  'return_charges_set',
  'payment_refunded',
  'contract_template_changed',
  'contract_issued',
  'contract_signed',
  'contract_voided',
] as const

export type ActivityKind = (typeof ACTIVITY_KINDS)[number] | 'other'

type T = TFunction<'bookings'>

/** What the facts are written with: the page's own formatters, or stand-ins in a test. */
interface Formats {
  currency: (amount: number) => string
  dateTime: (iso: string) => string
  number: (value: number) => string
}

const SIGNED = ['counter', 'e_signature'] as const
/** The API states why an agreement was voided in its own words; these are the ones it uses. */
const VOIDED = {
  'Booking changed': 'booking_changed',
  'Rental extended': 'rental_extended',
  'Template changed': 'template_changed',
} as const

/** An action added to the API later still shows, under a general title, rather than vanish. */
export function activityKind(type: string): ActivityKind {
  return (ACTIVITY_KINDS as readonly string[]).includes(type) ? (type as ActivityKind) : 'other'
}

export function activityTitle(event: BookingActivityEvent, t: T): string {
  const kind = activityKind(event.type)
  // The same action, but not the same thing: the renter asks, the counter books.
  if (kind === 'created' && event.actor.kind === 'renter') return t('details.activity.events.requested')
  return t(`details.activity.events.${kind}`)
}

export function activityActor(event: BookingActivityEvent, t: T): string {
  return event.actor.name ?? t(`details.activity.actors.${event.actor.kind}`)
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined)
const figure = (value: unknown) => (typeof value === 'number' ? value : undefined)
const names = (value: unknown) =>
  Array.isArray(value) ? value.filter((name): name is string => typeof name === 'string') : []
const among = <K extends string | number>(known: readonly K[], value: unknown) =>
  known.find((one) => one === value)

/**
 * What an event says beside its title, in the order it reads. Each fact is there only when the
 * entry carries it: actions logged before details were kept have a title and nothing more.
 */
export function activityFacts(
  event: BookingActivityEvent,
  t: T,
  format: Formats,
  { electric = false }: { electric?: boolean } = {},
): string[] {
  const d = event.detail
  const money = (value: unknown) => {
    const amount = figure(value)
    return amount === undefined ? undefined : format.currency(amount)
  }
  const moved = (key: 'pickupMoved' | 'returnMoved', from: unknown, to: unknown) => {
    const [was, now] = [text(from), text(to)]
    if (!was || !now || Date.parse(was) === Date.parse(now)) return undefined
    return t(`details.activity.facts.${key}`, { from: format.dateTime(was), to: format.dateTime(now) })
  }
  // Only when it moved: a swap at the same price has no total to speak of.
  const totalMoved = () => {
    const [was, now] = [figure(d.previousTotal), figure(d.total)]
    if (was === undefined || now === undefined || was === now) return undefined
    return t('details.activity.facts.totalMoved', { from: format.currency(was), to: format.currency(now) })
  }
  const readings = () => {
    // Only a level there are words for: any other number would print its own key.
    const [odometer, level] = [figure(d.odometer), among(FUEL_LEVELS, d.fuelLevel)]
    return [
      odometer !== undefined && t('details.condition.miles', { miles: format.number(odometer) }),
      level !== undefined &&
        t('details.activity.facts.level', {
          label: t(`details.condition.level.${electric ? 'charge' : 'fuel'}.short`),
          level: t(`details.condition.fuelLevels.${level}`),
        }),
    ]
  }
  const quoted = () => {
    const message = text(d.message)
    return message && t('details.activity.facts.quoted', { message })
  }

  const facts = (): (string | false | undefined)[] => {
    switch (activityKind(event.type)) {
      case 'created':
        return [text(d.vehicleName), money(d.total)]
      case 'declined': {
        const reason = among<DeclineReason>(DECLINE_REASONS, d.reason)
        return [reason && t(`details.declined.reasons.${reason}`), quoted()]
      }
      case 'cancelled': {
        const reason = among<CancelReason>(CANCEL_REASONS, d.reason)
        return [reason && t(`details.cancelled.reasons.${reason}`), quoted()]
      }
      case 'dates_changed':
        return [
          moved('pickupMoved', d.previousPickupAt, d.pickupAt),
          moved('returnMoved', d.previousReturnAt, d.returnAt),
          totalMoved(),
        ]
      case 'vehicle_swapped': {
        const [from, to] = [text(d.previousVehicle), text(d.vehicle)]
        return [
          from && to && t('details.activity.facts.vehicle', { from, to, plate: text(d.plate) ?? '' }),
          totalMoved(),
        ]
      }
      case 'drivers_changed': {
        const [added, removed] = [names(d.added), names(d.removed)]
        return [
          added.length > 0 && t('details.activity.facts.driversAdded', { names: added.join(', ') }),
          removed.length > 0 && t('details.activity.facts.driversRemoved', { names: removed.join(', ') }),
          totalMoved(),
        ]
      }
      case 'extended': {
        const added = figure(d.amount)
        return [
          moved('returnMoved', d.previousReturnAt, d.returnAt),
          added !== undefined && added > 0 && t('details.activity.facts.added', { amount: money(added) }),
        ]
      }
      case 'extension_requested': {
        const [when, toPay] = [text(d.returnAt), figure(d.amount)]
        return [
          when && t('details.activity.facts.returnTo', { when: format.dateTime(when) }),
          toPay !== undefined && toPay > 0 && t('details.activity.facts.toPay', { amount: money(toPay) }),
        ]
      }
      case 'extension_accepted':
        return [text(d.signerName)]
      case 'picked_up':
      case 'returned':
        return readings()
      case 'payment_link_created':
      case 'payment_link_shared': {
        const [amount, deposit] = [figure(d.amount), figure(d.deposit)]
        return [
          amount !== undefined && amount > 0 && money(amount),
          deposit !== undefined &&
            deposit > 0 &&
            t('details.activity.facts.plusDeposit', { amount: money(deposit) }),
        ]
      }
      case 'deposit_requested':
      case 'deposit_link_shared':
      case 'deposit_held':
      case 'deposit_lapsed':
      case 'deposit_captured':
      case 'deposit_released':
        return [money(d.amount)]
      case 'payment_recorded':
        return [money(d.amount), text(d.method)]
      case 'payment_received':
      case 'payment_processing':
        return [
          money(d.amount),
          text(d.method),
          d.for === 'extension' && t('details.activity.facts.forExtension'),
        ]
      case 'payment_failed':
        return [text(d.message)]
      case 'return_charges_set': {
        const count = figure(d.count)
        if (count === undefined) return []
        return count > 0
          ? [t('details.activity.facts.charges', { count }), money(d.total)]
          : [t('details.activity.facts.noCharges')]
      }
      case 'payment_refunded':
        return [money(d.amount), d.byHand === true ? t('details.activity.facts.byHand') : text(d.method)]
      case 'contract_template_changed':
      case 'contract_issued':
        return [text(d.template)]
      case 'contract_signed': {
        const method = among(SIGNED, d.method)
        return [text(d.signerName), method && t(`details.activity.facts.signed.${method}`)]
      }
      case 'contract_voided': {
        const reason = text(d.reason)
        const known = reason && reason in VOIDED ? VOIDED[reason as keyof typeof VOIDED] : undefined
        return [known ? t(`details.activity.facts.voided.${known}`) : reason]
      }
      default:
        return []
    }
  }

  return facts().filter((fact): fact is string => Boolean(fact))
}
