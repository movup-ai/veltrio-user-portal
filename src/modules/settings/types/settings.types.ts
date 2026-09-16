export type SettingsFieldKind = 'input' | 'select' | 'toggle'

export interface SettingsField {
  /** Key under `settings:sections.<section>.fields` for the label, plus `<key>Help` when `help` is true. */
  key: string
  /** A literal value (a name, an amount) when it needs no translation, or a `{ key, count }` lookup when it does. */
  value: string | { key: string; count?: number }
  kind: SettingsFieldKind
  span?: 1 | 2
  help?: boolean
  /** Toggle rows only — the switch position. */
  on?: boolean
}

export interface SettingsSectionDef {
  /** Key under `settings:sections` — supplies the title, description and field labels. */
  key: 'organization' | 'rentalPolicy'
  fields: SettingsField[]
}
