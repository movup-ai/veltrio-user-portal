import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Link2 } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { toast } from '@/components/ui/use-toast'
import { copyToClipboard } from '../utils/public-links'

interface Props {
  url: string
  label: string
  className?: string
}

/** Copies a customer-portal link, confirming in place rather than only through a toast. */
export function CopyLinkButton({ url, label, className }: Props) {
  const { t } = useTranslation('vehicles')
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const handleCopy = async () => {
    if (!(await copyToClipboard(url))) {
      toast({ title: t('publicLink.copyFailed'), description: url, variant: 'error' })
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <PageActionButton
      icon={copied ? Check : Link2}
      label={copied ? t('publicLink.copied') : label}
      onClick={() => void handleCopy()}
      className={className}
    />
  )
}
