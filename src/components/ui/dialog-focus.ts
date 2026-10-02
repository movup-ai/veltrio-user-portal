/**
 * For a dialog's `onOpenAutoFocus`: focus the dialog itself rather than its first field, which
 * would read as already chosen. Tab still reaches the fields in order. Pair with `outline-none`.
 */
export function focusDialogContent(event: Event) {
  event.preventDefault()
  ;(event.currentTarget as HTMLElement | null)?.focus()
}
