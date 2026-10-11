import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { Combobox } from './combobox'

describe('Combobox', () => {
  it('hands its input to the caller, so a form can focus the field it marked invalid', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Combobox ref={ref} aria-label="Make" value="" onChange={() => {}} options={['Toyota']} />)

    ref.current?.focus()

    expect(screen.getByRole('combobox', { name: 'Make' })).toHaveFocus()
  })
})
