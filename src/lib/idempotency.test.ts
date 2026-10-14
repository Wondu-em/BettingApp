import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { newKey, useIdempotencyKey } from './idempotency'

describe('newKey', () => {
  it('produces v4 UUIDs that differ every time', () => {
    const a = newKey()
    const b = newKey()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a).not.toBe(b)
  })
})

describe('useIdempotencyKey', () => {
  it('keeps the same key for retries of the same intent', () => {
    const { result, rerender } = renderHook(() => useIdempotencyKey())
    const first = result.current.current()
    rerender()
    expect(result.current.current()).toBe(first)
    expect(result.current.current()).toBe(first)
  })

  it('gives a new key after rotate()', () => {
    const { result } = renderHook(() => useIdempotencyKey())
    const first = result.current.current()
    result.current.rotate()
    expect(result.current.current()).not.toBe(first)
  })
})
