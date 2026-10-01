import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import type { DiscountTierValues } from '../schema/vehicle.schema'
import { DiscountTiersEditor } from './DiscountTiersEditor'

function Harness({ initial = [] }: { initial?: DiscountTierValues[] }) {
  const [value, setValue] = useState(initial)
  return <DiscountTiersEditor value={value} onChange={setValue} />
}

describe('DiscountTiersEditor', () => {
  it('opens a new tier with its threshold focused, so it can be typed straight away', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add discount tier' }))

    expect(screen.getByLabelText('Minimum days')).toHaveFocus()
  })

  it('describes the tier from the threshold as it is typed', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add discount tier' }))
    await user.keyboard('7')

    expect(screen.getByText('If the renter books 7 or more days, apply the discount')).toBeInTheDocument()
  })
})
