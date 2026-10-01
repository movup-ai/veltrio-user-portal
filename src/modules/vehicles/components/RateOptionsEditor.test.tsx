import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RateOptionsEditor } from './RateOptionsEditor'
import type { RateOptionValues } from '../schema/vehicle.schema'

function option(id: string): RateOptionValues {
  return { id, label: id, basis: 'day', rate: 50, includedMiles: 200, unlimitedMileage: false }
}

const OPTIONS = [option('daily'), option('weekly'), option('weekend')]
const ids = (options: RateOptionValues[]) => options.map((o) => o.id)
// jsdom has no DataTransfer; the handler only needs these two.
const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn() }

describe('RateOptionsEditor reordering', () => {
  it('moves a row to where its handle is dropped', () => {
    const onChange = vi.fn()
    render(<RateOptionsEditor value={OPTIONS} onChange={onChange} />)
    const handles = screen.getAllByLabelText(/^Reorder/)

    fireEvent.dragStart(handles[2], { dataTransfer })
    fireEvent.dragOver(handles[0], { dataTransfer })
    fireEvent.drop(handles[0], { dataTransfer })

    expect(ids(onChange.mock.calls[0][0])).toEqual(['weekend', 'daily', 'weekly'])
  })

  it('moves a row with the arrow keys, and not past either end', async () => {
    const user = userEvent.setup({ delay: null })
    const onChange = vi.fn()
    render(<RateOptionsEditor value={OPTIONS} onChange={onChange} />)
    const handles = screen.getAllByLabelText(/^Reorder/)

    handles[1].focus()
    await user.keyboard('{ArrowUp}')
    expect(ids(onChange.mock.calls[0][0])).toEqual(['weekly', 'daily', 'weekend'])

    handles[0].focus()
    await user.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
