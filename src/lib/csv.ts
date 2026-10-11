import { saveBlob } from './download'

/**
 * A spreadsheet runs a cell that begins like a formula, and some of what is exported was typed
 * by a stranger on the marketplace form. A leading apostrophe makes the cell plain text. A
 * phone number or a negative amount also starts with + or -, so those two are only guarded
 * when letters follow.
 */
function neutralise(value: string): string {
  const formula = /^[=@\t\r]/.test(value) || (/^[+-]/.test(value) && /[A-Za-z]/.test(value))
  return formula ? `'${value}` : value
}

function toCell(value: string): string {
  return `"${neutralise(value).replace(/"/g, '""')}"`
}

/** Rows of cells as one CSV document, header row included by the caller. */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(toCell).join(',')).join('\r\n')
}

export function downloadCsv(rows: string[][], filename: string): void {
  saveBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }), filename)
}
