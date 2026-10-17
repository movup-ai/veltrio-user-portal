import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useUrlSearch } from './use-url-search'

function renderAt(path: string) {
  return renderHook(() => ({ search: useUrlSearch(), navigate: useNavigate() }), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
  })
}

describe('useUrlSearch', () => {
  it('starts from the search the header opened the list with', () => {
    const { result } = renderAt('/bookings?search=kevin')

    expect(result.current.search[0]).toBe('kevin')
  })

  it('starts empty without one, and keeps what is typed', () => {
    const { result } = renderAt('/bookings')
    expect(result.current.search[0]).toBe('')

    act(() => result.current.search[1]('honda'))

    expect(result.current.search[0]).toBe('honda')
  })

  it('takes a new search from the header while the list is already open', () => {
    const { result } = renderAt('/bookings?search=kevin')
    act(() => result.current.search[1]('typed'))

    act(() => void result.current.navigate('/bookings?search=ana'))

    expect(result.current.search[0]).toBe('ana')
  })
})
