import { useState } from 'react'
import { UserMinus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useFormatters } from '@/i18n'
import { DAY_FORMAT } from '@/lib/date-format'
import type { MembershipRole } from '@/types/user'
import { initials } from '@/utils/formatting'
import { useChangeRole, useMembers, useRemoveMember } from '../hooks/use-members'
import { MEMBERSHIP_ROLES, type Member } from '../types/users.types'
import { isLastOwner } from '../utils/members.utils'
import { TeamCard, TeamList, TeamRow } from './TeamCard'

/** Who is in the company, in what role. Changes take effect on each person's next request. */
export function MembersSection() {
  const { t } = useTranslation('settings')
  const { data: members, isLoading, refetch } = useMembers()
  const changeRole = useChangeRole()
  const remove = useRemoveMember()
  const [removing, setRemoving] = useState<Member>()
  // An owner stepping down loses this page with the click, so it is asked first.
  const [steppingDown, setSteppingDown] = useState<{ member: Member; role: MembershipRole }>()

  const onRole = (member: Member, role: MembershipRole) => {
    if (member.isYou && member.role === 'owner' && role !== 'owner') setSteppingDown({ member, role })
    else changeRole.mutate({ member, role })
  }

  return (
    <TeamCard title={t('users.members.title')} description={t('users.members.description')}>
      {isLoading ? (
        <LoadingState />
      ) : !members ? (
        <ErrorState className="py-10" onRetry={() => void refetch()} />
      ) : (
        <TeamList>
          {members.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              locked={isLastOwner(member, members)}
              onRole={(role) => onRole(member, role)}
              onRemove={() => setRemoving(member)}
            />
          ))}
        </TeamList>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={t('users.remove.title', { name: removing?.fullName })}
        description={t(removing?.isYou ? 'users.remove.selfDescription' : 'users.remove.description')}
        confirmLabel={t('users.remove.confirm')}
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing, { onSuccess: () => setRemoving(undefined) })}
      />
      <ConfirmDialog
        open={Boolean(steppingDown)}
        onOpenChange={(open) => !open && setSteppingDown(undefined)}
        title={t('users.stepDown.title')}
        description={t('users.stepDown.description')}
        confirmLabel={t('users.stepDown.confirm')}
        loading={changeRole.isPending}
        onConfirm={() =>
          steppingDown && changeRole.mutate(steppingDown, { onSuccess: () => setSteppingDown(undefined) })
        }
      />
    </TeamCard>
  )
}

function MemberRow({
  member,
  locked,
  onRole,
  onRemove,
}: {
  member: Member
  locked: boolean
  onRole: (role: MembershipRole) => void
  onRemove: () => void
}) {
  const { t } = useTranslation('settings')
  const { t: tNav } = useTranslation('nav')
  const format = useFormatters()

  return (
    <TeamRow>
      {/* A line to itself on a phone, where beside the controls the email was cut to a few letters. */}
      <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
        <span
          className="bg-surface-3 text-fg-2 flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
          aria-hidden
        >
          {initials(member.fullName)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-foreground truncate font-medium">
            {member.fullName}
            {member.isYou && <span className="text-fg-4 font-normal"> · {t('users.members.you')}</span>}
          </span>
          <span className="text-fg-4 truncate text-[12px]">
            {member.email} · {t('users.members.joined', { date: format.date(member.joinedAt, DAY_FORMAT) })}
          </span>
        </div>
      </div>

      <span className="ml-auto flex gap-2 sm:ml-0">
        <LastOwnerHint locked={locked}>
          <Select
            value={member.role}
            onValueChange={(role) => onRole(role as MembershipRole)}
            disabled={locked}
          >
            <SelectTrigger
              className="w-[132px]"
              aria-label={t('users.members.roleOf', { name: member.fullName })}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBERSHIP_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {tNav(`sidebar.roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LastOwnerHint>
        <LastOwnerHint locked={locked}>
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={locked}
            aria-label={t('users.members.removeNamed', { name: member.fullName })}
          >
            <UserMinus aria-hidden />
            {t('users.members.remove')}
          </Button>
        </LastOwnerHint>
      </span>
    </TeamRow>
  )
}

/** A disabled control says nothing on its own, so the reason sits on a wrapper that can be hovered. */
function LastOwnerHint({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  const { t } = useTranslation('settings')
  if (!locked) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>{t('users.members.lastOwner')}</TooltipContent>
    </Tooltip>
  )
}
