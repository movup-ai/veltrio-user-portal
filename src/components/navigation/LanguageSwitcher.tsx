import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LANGUAGES, isLanguage, type Language } from '@/i18n'
import { cn } from '@/lib/utils'
import { FlagIcon } from './FlagIcon'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation('common')
  const active: Language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en'
  const activeLanguage = LANGUAGES.find((l) => l.code === active) ?? LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('language.switch')}
          className={cn(
            'bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground flex h-[34px] shrink-0 items-center gap-[7px] rounded-[9px] border px-2.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors',
            className,
          )}
        >
          <FlagIcon language={active} />
          <span>{activeLanguage.short}</span>
          <ChevronDown className="text-fg-4 size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[168px]">
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onSelect={() => void i18n.changeLanguage(language.code)}
            className="gap-2.5"
          >
            <FlagIcon language={language.code} />
            <span className={cn('flex-1', language.code === active && 'font-semibold')}>{language.label}</span>
            {language.code === active && <Check className="text-primary size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
