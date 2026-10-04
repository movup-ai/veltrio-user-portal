import type { FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form'

/**
 * Makes the saved values the form's new baseline, then puts back anything typed while the save
 * was in flight. A plain reset would discard those edits; they come back dirty, ready to save.
 */
export function resetKeepingEdits<V extends FieldValues>(form: UseFormReturn<V>, atSubmit: V, saved: V): void {
  const current = form.getValues()
  form.reset(saved)
  for (const key of Object.keys(saved) as Path<V>[]) {
    if (current[key] !== atSubmit[key]) {
      form.setValue(key, current[key] as PathValue<V, Path<V>>, { shouldDirty: true })
    }
  }
}
