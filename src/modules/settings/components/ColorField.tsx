import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { isHexColor } from '../utils/brand.utils'

interface ColorFieldProps {
  /** The field's label, so each swatch announces which colour it picks. */
  name: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  id: string
  invalid: boolean
  'aria-describedby'?: string
}

/** A swatch that opens the system colour picker, beside the hex code for typing or pasting. */
export function ColorField({ name, value, onChange, onBlur, id, invalid, ...aria }: ColorFieldProps) {
  const { t } = useTranslation('settings')
  const valid = isHexColor(value)

  return (
    <div className="flex gap-2">
      <label
        className="border-border relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs"
        style={{ background: valid ? value : 'transparent' }}
      >
        <input
          type="color"
          // The picker only takes a full lowercase hex, so a half-typed code shows black until valid.
          value={valid ? value.trim().toLowerCase() : '#000000'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={t('brand.style.pick', { name: name.toLowerCase() })}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        invalid={invalid}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        className="font-mono uppercase"
        {...aria}
      />
    </div>
  )
}
