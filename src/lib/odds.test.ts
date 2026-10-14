import { describe, expect, it } from 'vitest'
import { validateOdds } from './odds'

describe('validateOdds (mirrors the server rules)', () => {
  it.each([
    ['2.10', 2.1],
    ['2', 2],
    ['1.0001', 1.0001],
    ['1000', 1000],
    [' 3.40 ', 3.4],
  ])('accepts %j', (input, odds) => {
    expect(validateOdds(input)).toEqual({ ok: true, odds })
  })

  it('rejects odds at or below 1.00', () => {
    expect(validateOdds('1')).toEqual({ ok: false, error: 'Odds must be above 1.00.' })
    expect(validateOdds('1.0000')).toMatchObject({ ok: false })
    expect(validateOdds('0.5')).toMatchObject({ ok: false })
  })

  it('rejects odds above 1000 and more than 4 decimals', () => {
    expect(validateOdds('1000.01')).toMatchObject({ ok: false })
    expect(validateOdds('2.12345')).toEqual({ ok: false, error: 'Odds may have at most 4 decimals.' })
  })

  it.each(['', 'abc', '-2', '2,5', '1e3', '2.'])('rejects %j', (input) => {
    expect(validateOdds(input)).toMatchObject({ ok: false })
  })

  it('sends decimals the server reads exactly (no float noise)', () => {
    expect(JSON.stringify({ odds: (validateOdds('2.2') as { odds: number }).odds })).toBe('{"odds":2.2}')
  })
})
