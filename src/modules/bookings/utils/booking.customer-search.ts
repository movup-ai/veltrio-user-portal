/** Divides the name from the email in a picked renter's label. */
export const LABEL_SEPARATOR = ' · '

/**
 * What the lookup box shows for a renter. Two people genuinely share a name, so the label
 * carries the email that distinguishes them — resolving on the name alone would silently
 * pick whichever matched first and attach the booking (and its scans) to the wrong person.
 */
export function customerLabel(customer: { name: string; email: string }): string {
  return `${customer.name}${LABEL_SEPARATOR}${customer.email}`
}

/**
 * What to search the customer book for, given whatever the lookup box is showing.
 *
 * A picked renter searches blank, which lists the book: narrowing to the person already
 * chosen would leave the counter unable to switch to anyone else without clearing the field
 * first. Typed text still narrows, and a whole label never goes over — the API matches a term
 * against one column at a time, so a name-and-email string matches nobody.
 */
export function customerSearchTerm(display: string): string {
  return isCustomerLabel(display) ? '' : display
}

/**
 * Whether the box is showing a renter that was picked, rather than text being typed.
 *
 * Decided on the trailing email rather than the separator alone: nothing stops a renter being
 * named "Ann · Marie", and treating that as a selection would stop it narrowing as it is typed.
 */
function isCustomerLabel(display: string): boolean {
  const separator = display.lastIndexOf(LABEL_SEPARATOR)
  if (separator === -1) return false
  const tail = display.slice(separator + LABEL_SEPARATOR.length)
  return tail.includes('@') && !tail.includes(' ')
}
