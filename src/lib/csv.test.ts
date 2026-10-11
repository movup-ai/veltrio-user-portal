import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('quotes every cell and doubles a quote inside one', () => {
    expect(
      toCsv([
        ['Name', 'Note'],
        ['Ann "Annie" Lee', 'a, b'],
      ]),
    ).toBe('"Name","Note"\r\n"Ann ""Annie"" Lee","a, b"')
  })

  it('stops a cell a stranger typed from running as a formula', () => {
    // A renter's name comes off a public form, and the file is opened in a spreadsheet.
    const [cells] = [toCsv([['=HYPERLINK("http://x")', '@SUM(A1)', '+cmd|calc', '-2+3+cmd']])]

    expect(cells).toBe(`"'=HYPERLINK(""http://x"")","'@SUM(A1)","'+cmd|calc","'-2+3+cmd"`)
  })

  it('leaves a phone number and a negative amount as they are', () => {
    expect(toCsv([['+1 (305) 442-0118', '-310.50', '−$310']])).toBe('"+1 (305) 442-0118","-310.50","−$310"')
  })
})
