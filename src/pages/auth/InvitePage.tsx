import { useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ONBOARDING_PATHS } from '@/app/layouts/onboarding-steps'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useAcceptInvitation,
  useInvitationPreview,
  useMyInvitations,
} from '@/modules/users/hooks/use-invitations'
import { acceptError, inviteView, type JoinTarget } from '@/modules/users/utils/invite.utils'
import { useMe } from '@/services/auth/use-me'
import { StepHeading } from './StepHeading'

/**
 * Where an invitation link lands, and where a new account with invitations is sent instead of
 * company setup. With a token it shows that invitation; without one, the account's own.
 */
export function InvitePage() {
  const { t } = useTranslation('auth')
  const { token } = useParams()
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const me = useMe()
  const hasCompany = Boolean(me.data?.membership)
  const preview = useInvitationPreview(token)
  const mine = useMyInvitations(userId, Boolean(isSignedIn) && !token && !hasCompany)

  if (!isLoaded || (isSignedIn && me.isPending)) return <LoadingState />
  if (preview.isError) return <ErrorState onRetry={() => void preview.refetch()} />
  if (mine.isError) return <ErrorState onRetry={() => void mine.refetch()} />

  const view = inviteView({
    token,
    signedIn: Boolean(isSignedIn),
    preview: preview.data,
    mine: mine.data,
    email: user?.primaryEmailAddress?.emailAddress,
    hasCompany,
  })
  const here = window.location.origin + window.location.pathname

  switch (view.kind) {
    case 'loading':
      return <LoadingState />
    case 'signIn':
      return <Navigate to={`/login?redirect_url=${encodeURIComponent(here)}`} replace />
    case 'signedOut':
      return (
        <Panel
          title={t('invite.title', { company: view.preview.companyName })}
          subtitle={t('invite.subtitle', { role: t(`invite.roles.${view.preview.role}`) })}
        >
          <p className="text-description m-0 text-center">
            {t('invite.invitedEmail', { email: view.preview.email })}
          </p>
          {/* Sign-up then lands on onboarding, which sends an account with an invitation back here. */}
          <Button asChild>
            <Link to={`/sign-up?redirect_url=${encodeURIComponent(here)}`}>{t('invite.signUp')}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/login?redirect_url=${encodeURIComponent(here)}`}>{t('invite.signIn')}</Link>
          </Button>
        </Panel>
      )
    case 'wrongAccount':
      return <WrongAccount invited={view.preview.email} current={view.signedInAs} returnTo={here} />
    case 'expired':
      return (
        <Panel
          title={t('invite.expired.title')}
          subtitle={t('invite.expired.description', { company: view.companyName })}
        >
          <OwnCompanyLink signedIn={Boolean(isSignedIn)} />
        </Panel>
      )
    case 'notFound':
      return (
        <Panel title={t('invite.notFound.title')} subtitle={t('invite.notFound.description')}>
          <OwnCompanyLink signedIn={Boolean(isSignedIn)} />
        </Panel>
      )
    case 'none':
      return (
        <Panel title={t('invite.none.title')} subtitle={t('invite.none.description')}>
          <OwnCompanyLink signedIn />
        </Panel>
      )
    case 'alreadyMember':
      return (
        <Panel title={t('invite.alreadyMember.title')} subtitle={t('invite.alreadyMember.description')}>
          <Button asChild>
            <Link to="/dashboard">{t('invite.alreadyMember.dashboard')}</Link>
          </Button>
        </Panel>
      )
    case 'join':
      return (
        <Join
          invitations={view.invitations}
          // An existing account keeps its name; only a new one is asked for it.
          savedName={me.data?.user.fullName}
          clerkName={user?.fullName ?? ''}
        />
      )
  }
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <StepHeading title={title} className="mb-2">
        {subtitle}
      </StepHeading>
      {children}
    </div>
  )
}

/** Past an invitation that cannot be used, the other way in is a company of one's own. */
function OwnCompanyLink({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation('auth')
  return (
    <Button variant="outline" asChild>
      <Link to={signedIn ? ONBOARDING_PATHS.company : '/sign-up'}>{t('noTenant.createCompany')}</Link>
    </Button>
  )
}

function WrongAccount({
  invited,
  current,
  returnTo,
}: {
  invited: string
  current: string
  returnTo: string
}) {
  const { t } = useTranslation('auth')
  const clerk = useClerk()
  return (
    <Panel
      title={t('invite.wrongAccount.title')}
      subtitle={t('invite.wrongAccount.description', { invited, current })}
    >
      <Button onClick={() => void clerk.signOut({ redirectUrl: returnTo })}>
        {t('invite.wrongAccount.signOut')}
      </Button>
    </Panel>
  )
}

function Join({
  invitations,
  savedName,
  clerkName,
}: {
  invitations: JoinTarget[]
  savedName: string | undefined
  clerkName: string
}) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const { userId } = useAuth()
  const accept = useAcceptInvitation(userId)
  const [name, setName] = useState(savedName ?? clerkName)
  const [nameError, setNameError] = useState<string>()
  // Held through the navigation that follows success, so a second click cannot land.
  const joining = accept.isPending || accept.isSuccess ? accept.variables?.id : undefined
  const single = invitations.length === 1 ? invitations[0] : undefined

  const join = (invitation: JoinTarget) => {
    if (!name.trim()) {
      setNameError(t('invite.errors.fullNameRequired'))
      return
    }
    setNameError(undefined)
    accept.mutate(
      { id: invitation.id, fullName: name.trim() },
      { onSuccess: () => navigate('/dashboard', { replace: true }) },
    )
  }

  return (
    <Panel
      title={single ? t('invite.title', { company: single.companyName }) : t('invite.chooseTitle')}
      subtitle={
        single ? t('invite.subtitle', { role: t(`invite.roles.${single.role}`) }) : t('invite.chooseSubtitle')
      }
    >
      {savedName === undefined && (
        <FormField label={t('invite.fullName')} error={nameError} required>
          {(fieldProps) => (
            <Input
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              {...fieldProps}
            />
          )}
        </FormField>
      )}
      {invitations.map((invitation) => (
        <Button
          key={invitation.id}
          variant={single ? 'primary' : 'outline'}
          loading={joining === invitation.id}
          disabled={joining !== undefined && joining !== invitation.id}
          onClick={() => join(invitation)}
          className={single ? undefined : 'h-auto justify-between py-2.5'}
        >
          {single ? (
            t('invite.accept', { company: invitation.companyName })
          ) : (
            <>
              <span className="font-semibold">{invitation.companyName}</span>
              <span className="text-fg-3 text-[12.5px]">
                {t('invite.joinAs', { role: t(`invite.roles.${invitation.role}`) })}
              </span>
            </>
          )}
        </Button>
      ))}
      {accept.error && (
        <p role="alert" className="text-error m-0 text-center text-[13px]">
          {t(`invite.errors.${acceptError(accept.error)}`)}
        </p>
      )}
    </Panel>
  )
}
