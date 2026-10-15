import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Combobox, type ComboboxProps } from '@/components/ui/combobox'
import { matchTimezone, timezoneOptions } from '@/utils/timezones'

interface TimezoneComboboxProps extends Omit<ComboboxProps, 'options' | 'value' | 'onChange'> {
  /** An IANA zone; an old name such as "Asia/Calcutta" still shows as its zone. */
  value: string
  onChange: (zone: string) => void
  /** ISO code whose zones are listed first. */
  country?: string
}

/** Holds the IANA name and shows the readable label, as the country picker holds its code. */
export function TimezoneCombobox({ value, onChange, country, ...props }: TimezoneComboboxProps) {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const options = useMemo(() => timezoneOptions(language, country), [language, country])
  const zone = matchTimezone(value)

  return (
    <Combobox
      options={options.map((option) => option.label)}
      value={options.find((option) => option.zone === zone)?.label ?? value}
      onChange={(label) => onChange(options.find((option) => option.label === label)?.zone ?? '')}
      {...props}
    />
  )
}
