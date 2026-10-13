import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReviewRow, ReviewRowGrid } from './ReviewSummary'

function cell(plain?: boolean) {
  render(
    <ReviewRowGrid plain={plain}>
      <ReviewRow label="Plate" value="ABC1234" />
    </ReviewRowGrid>,
  )
  return screen.getByText('Plate').parentElement
}

describe('ReviewRowGrid', () => {
  it('rules off each cell, as the vehicle page’s specifications are', () => {
    expect(cell()).toHaveClass('border-b', 'pb-2.5')
  })

  it('leaves the rules out when asked, with no padding left where they were', () => {
    expect(cell(true)).not.toHaveClass('border-b', 'pb-2.5')
  })
})
