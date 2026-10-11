/** Years the date-of-birth picker offers: nobody on file was born outside the last century. */
export const DOB_YEAR_RANGE = { from: new Date().getFullYear() - 100, to: new Date().getFullYear() }

/** How a calendar day on a customer's record reads: "Apr 17, 1991". */
export const DAY_FORMAT: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
