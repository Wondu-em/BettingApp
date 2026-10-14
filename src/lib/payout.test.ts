import { describe, expect, it } from 'vitest'
import { formatOdds, potentialPayout } from './payout'

describe('potentialPayout', () => {
  it('matches the design: 100.00 at 2.10 pays 210.00', () => {
    expect(potentialPayout(10_000, 21_000)).toBe(21_000)
  })

  it('rounds down like the server (house favour)', () => {
    expect(potentialPayout(333, 15_000)).toBe(499) // 499.5 -> 499
    expect(potentialPayout(1, 10_001)).toBe(1) // 1.0001 -> 1
  })

  it('returns 0 for invalid input instead of NaN', () => {
    expect(potentialPayout(0, 21_000)).toBe(0)
    expect(potentialPayout(-5, 21_000)).toBe(0)
    expect(potentialPayout(100, 0)).toBe(0)
    expect(potentialPayout(Number.NaN, 21_000)).toBe(0)
  })

  it('stays exact at the largest allowed stake and odds', () => {
    expect(potentialPayout(100_000_000, 10_000_000)).toBe(100_000_000_000)
  })
})

describe('formatOdds', () => {
  it('shows two decimals', () => {
    expect(formatOdds(21_000)).toBe('2.10')
    expect(formatOdds(34_000)).toBe('3.40')
  })
})
