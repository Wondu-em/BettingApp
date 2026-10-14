import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './useCountdown'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useCountdown', () => {
  it('counts down whole seconds and stops at zero', () => {
    const { result } = renderHook(() => useCountdown())
    expect(result.current.remaining).toBe(0)

    act(() => result.current.start(3))
    expect(result.current.remaining).toBe(3)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.remaining).toBe(2)

    act(() => vi.advanceTimersByTime(2500))
    expect(result.current.remaining).toBe(0)
  })
})
