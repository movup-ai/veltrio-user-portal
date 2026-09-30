import { render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

/**
 * The vehicle form's location field, with the default set the moment options are known. Inside
 * a <form>, Radix mirrors the value into a hidden native <select>. `cached` is the case that
 * broke: options already in the query cache on the first render.
 */
function LocationForm({ cached }: { cached: boolean }) {
  const [names, setNames] = useState<string[]>(cached ? ['Miami Airport', 'Downtown'] : [])
  const { control, setValue, formState } = useForm<{ location: string }>({
    defaultValues: { location: '' },
    mode: 'onChange',
  })

  useEffect(() => {
    if (cached) return
    const id = setTimeout(() => setNames(['Miami Airport', 'Downtown']), 0)
    return () => clearTimeout(id)
  }, [cached])
  useEffect(() => {
    if (names.length) setValue('location', names[0])
  }, [names, setValue])

  return (
    <form>
      <Controller
        control={control}
        name="location"
        rules={{ required: 'Select a location' }}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange} disabled={!names.length}>
            <SelectTrigger aria-label="Location">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {names.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <p>{formState.errors.location?.message}</p>
    </form>
  )
}

describe('a select inside a form', () => {
  it.each([
    ['arriving after mount', false],
    ['already cached on the first render', true],
  ])('keeps a default set with options %s, with no error', async (_, cached) => {
    render(<LocationForm cached={cached} />)

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Location' })).toHaveTextContent('Miami Airport'),
    )
    expect(screen.queryByText('Select a location')).not.toBeInTheDocument()
  })
})
