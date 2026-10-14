import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDelayedFlag } from './useDelayedFlag'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDelayedFlag', () => {
  it('turns on only after the delay while active', () => {
    const { result } = renderHook(() => useDelayedFlag(true, 4000))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(3999))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(2))
    expect(result.current).toBe(true)
  })

  it('never turns on if the work finishes in time, and resets afterwards', () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active, 4000), {
      initialProps: { active: true },
    })
    act(() => vi.advanceTimersByTime(2000))
    rerender({ active: false })
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current).toBe(false)

    rerender({ active: true })
    expect(result.current).toBe(false) // starts over, does not show immediately
  })
})
