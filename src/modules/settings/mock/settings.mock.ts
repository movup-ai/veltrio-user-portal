import type { SettingsSectionDef } from '../types/settings.types'

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    key: 'organization',
    fields: [
      { key: 'legalName', value: 'Sunstate Car Company LLC', kind: 'input', span: 2 },
      { key: 'tradingName', value: 'Sunstate Car Co.', kind: 'input', span: 1 },
      { key: 'taxId', value: 'US · 47-8829104', kind: 'input', span: 1 },
      { key: 'currency', value: { key: 'currencyValue' }, kind: 'select', span: 1, help: true },
      { key: 'timezone', value: 'America/New_York', kind: 'select', span: 1, help: true },
    ],
  },
  {
    key: 'rentalPolicy',
    fields: [
      { key: 'minimumAge', value: { key: 'minimumAgeValue', count: 21 }, kind: 'select', span: 1, help: true },
      { key: 'securityDeposit', value: '$350', kind: 'input', span: 1, help: true },
      { key: 'gracePeriod', value: { key: 'gracePeriodValue', count: 29 }, kind: 'select', span: 1, help: true },
      { key: 'fuelPolicy', value: { key: 'fuelPolicyValue' }, kind: 'select', span: 1 },
      { key: 'requireId', value: { key: 'requireIdValue' }, kind: 'toggle', span: 1, help: true, on: true },
      { key: 'autoChargeLateFees', value: { key: 'autoChargeLateFeesValue' }, kind: 'toggle', span: 1, on: true },
    ],
  },
]
