import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { ToneBadge } from '@/components/data-display/ToneBadge'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n'
import { DAY_FORMAT } from '@/lib/date-format'
import { useInvitations, useResendInvitation, useRevokeInvitation } from '../hooks/use-invitations'
import type { Invitation, SentInvitation } from '../types/users.types'
import { TeamCard, TeamList, TeamRow } from './TeamCard'

/** Invitations not yet accepted. Hidden while there are none, so a settled team reads as one list. */
export function PendingInvitations({ onSent }: { onSent: (invitation: SentInvitation) => void }) {
  const { t } = useTranslation('settings')
  const { data: invitations, isLoading, refetch } = useInvitations()
  const resend = useResendInvitation()
  const revoke = useRevokeInvitation()
  const [revoking, setRevoking] = useState<Invitation>()

  if (invitations?.length === 0) return null

  return (
    // Loading and failure sit under this card's title: bare, they read as part of the Team card.
    <TeamCard title={t('users.pending.title')} description={t('users.pending.description')}>
      {isLoading ? (
        <LoadingState />
      ) : !invitations ? (
        <ErrorState
          className="py-10"
          description={t('users.pending.loadError')}
          onRetry={() => void refetch()}
        />
      ) : (
        <TeamList>
          {invitations.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              resending={resend.isPending && resend.variables?.id === invitation.id}
              onResend={() => resend.mutate(invitation, { onSuccess: onSent })}
              onRevoke={() => setRevoking(invitation)}
            />
          ))}
        </TeamList>
      )}

      <ConfirmDialog
        open={Boolean(revoking)}
        onOpenChange={(open) => !open && setRevoking(undefined)}
        title={t('users.revoke.title')}
        description={t('users.revoke.description', { email: revoking?.email })}
        confirmLabel={t('users.revoke.confirm')}
        loading={revoke.isPending}
        onConfirm={() => revoking && revoke.mutate(revoking, { onSuccess: () => setRevoking(undefined) })}
      />
    </TeamCard>
  )
}

function InvitationRow({
  invitation,
  resending,
  onResend,
  onRevoke,
}: {
  invitation: Invitation
  resending: boolean
  onResend: () => void
  onRevoke: () => void
}) {
  const { t } = useTranslation('settings')
  const { t: tNav } = useTranslation('nav')
  const format = useFormatters()
  const sent = format.date(invitation.createdAt, DAY_FORMAT)

  return (
    <TeamRow>
      <div className="flex min-w-0 flex-1 basis-full flex-col gap-0.5 sm:basis-0">
        <span className="text-foreground truncate font-medium">{invitation.email}</span>
        <span className="text-fg-4 text-[12px]">
          {[
            tNav(`sidebar.roles.${invitation.role}`),
            invitation.invitedByName
              ? t('users.pending.sentBy', { date: sent, name: invitation.invitedByName })
              : t('users.pending.sent', { date: sent }),
          ].join(' · ')}
        </span>
      </div>
      {invitation.expired && <ToneBadge tone="warning">{t('users.pending.expired')}</ToneBadge>}
      <span className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" loading={resending} onClick={onResend}>
          {t('users.pending.resend')}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onRevoke}
          aria-label={t('users.pending.revokeFor', { email: invitation.email })}
        >
          {t('users.pending.revoke')}
        </Button>
      </span>
    </TeamRow>
  )
}
