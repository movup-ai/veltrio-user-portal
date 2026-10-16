import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useOrganizationStore } from '@/state/organization.store'
import { useUpdateSetup } from '../hooks/use-setup'
import type { Setup, SetupStepStatus } from '../types/setup.types'
import { progressSegments, setupProgress } from '../utils/setup.utils'
import { SetupStepList } from './SetupStepList'

const SEGMENT: Record<SetupStepStatus, string> = {
  done: 'bg-primary',
  pending: 'bg-info',
  todo: 'bg-surface-3',
}

export function SetupChecklist({ setup }: { setup: Setup }) {
  const { t } = useTranslation('dashboard')
  const isOwner = useOrganizationStore((state) => state.membership?.role) === 'owner'
  const update = useUpdateSetup()
  const { done, total } = setupProgress(setup.steps)

  return (
    <Card as="section" className="p-[18px]">
      <div className="flex items-start gap-3">
        <PanelHeading
          className="flex-1"
          title={t('setup.title')}
          description={t('setup.progress', { done, total })}
        />
        {isOwner && (
          <button
            type="button"
            aria-label={t('setup.dismiss')}
            title={t('setup.dismiss')}
            disabled={update.isPending}
            onClick={() => update.mutate({ dismissed: true })}
            className="text-fg-3 hover:bg-surface-3 hover:text-foreground -mt-1 -mr-1 rounded-md p-1.5 transition-colors"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={t('setup.title')}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-3.5 flex gap-1"
      >
        {progressSegments(setup.steps).map((status, index) => (
          <span key={index} className={cn('h-1.5 flex-1 rounded-full', SEGMENT[status])} />
        ))}
      </div>
      <SetupStepList
        className="mt-4"
        steps={setup.steps}
        onReviewAgreement={isOwner ? () => update.mutate({ agreementReviewed: true }) : undefined}
        reviewing={update.isPending}
      />
    </Card>
  )
}
