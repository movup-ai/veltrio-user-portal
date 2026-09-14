import type { SettingsSectionDef } from '../types/settings.types'

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    title: 'Organization',
    description: 'Appears on invoices, rental agreements and customer emails.',
    fields: [
      { label: 'Legal name', value: 'Sunstate Car Company LLC', kind: 'input', span: 2 },
      { label: 'Trading name', value: 'Sunstate Car Co.', kind: 'input', span: 1 },
      { label: 'Tax ID', value: 'US · 47-8829104', kind: 'input', span: 1 },
      { label: 'Currency', value: 'USD — US Dollar', kind: 'select', span: 1, help: 'Applies to all rates and invoices.' },
      { label: 'Timezone', value: 'America/New_York', kind: 'select', span: 1, help: 'Pickup and return times are shown in this zone.' },
    ],
  },
  {
    title: 'Rental policy',
    description: 'Defaults applied to new bookings unless overridden per location.',
    fields: [
      { label: 'Minimum driver age', value: '21 years', kind: 'select', span: 1, help: 'Under-25 fee is set in Pricing.' },
      { label: 'Security deposit', value: '$350', kind: 'input', span: 1, help: 'Held on the card at pickup.' },
      { label: 'Grace period', value: '29 minutes', kind: 'select', span: 1, help: 'Before a late-return fee applies.' },
      { label: 'Fuel policy', value: 'Same-to-same', kind: 'select', span: 1 },
      { label: 'Require ID verification', value: 'Required before pickup', kind: 'toggle', span: 1, help: 'Blocks counter handover until documents clear.' },
      { label: 'Auto-charge late fees', value: 'Enabled', kind: 'toggle', span: 1 },
    ],
  },
]
