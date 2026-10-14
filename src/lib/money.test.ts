import { describe, expect, it } from 'vitest'
import { MAX_SINGLE_AMOUNT, formatAmount, formatEtb, formatSigned, parseEtb, validateAmount } from './money'

describe('formatAmount / formatEtb', () => {
  it('formats minor units with grouping and two decimals', () => {
    expect(formatAmount(125_000)).toBe('1,250.00')
    expect(formatAmount(5)).toBe('0.05')
    expect(formatAmount(0)).toBe('0.00')
    expect(formatAmount(100_000_000)).toBe('1,000,000.00')
  })

  it('handles negative values', () => {
    expect(formatAmount(-10_000)).toBe('-100.00')
  })

  it('adds the currency prefix', () => {
    expect(formatEtb(125_000)).toBe('ETB 1,250.00')
  })
})

describe('formatSigned', () => {
  it('shows credits as + and debits as -', () => {
    expect(formatSigned(50_000, 'Credit')).toBe('+500.00')
    expect(formatSigned(10_000, 'Debit')).toBe('-100.00')
  })
})

describe('parseEtb', () => {
  it.each([
    ['500', 50_000],
    ['500.00', 50_000],
    ['12.5', 1_250],
    ['0.01', 1],
    ['1,250.00', 125_000],
    [' 7 ', 700],
  ])('parses %j as %d minor units', (input, expected) => {
    expect(parseEtb(input)).toBe(expected)
  })

  it.each(['', 'abc', '12.505', '-5', '1e3', '12.', '.5', '1 000', '1.2.3'])('rejects %j', (input) => {
    expect(parseEtb(input)).toBeNull()
  })

  it('does not suffer floating point drift', () => {
    // 19.99 * 100 === 1998.9999999999998 in floating point
    expect(parseEtb('19.99')).toBe(1_999)
    expect(parseEtb('0.07')).toBe(7)
    expect(parseEtb('1.15')).toBe(115)
  })
})

describe('validateAmount', () => {
  it('accepts a normal amount', () => {
    expect(validateAmount('500.00')).toEqual({ ok: true, minor: 50_000 })
  })

  it('rejects empty, zero, malformed and above-maximum amounts', () => {
    expect(validateAmount('')).toMatchObject({ ok: false })
    expect(validateAmount('0')).toMatchObject({ ok: false })
    expect(validateAmount('12.505')).toMatchObject({ ok: false })
    expect(validateAmount('1000000.01')).toMatchObject({ ok: false })
  })

  it('accepts exactly the maximum', () => {
    expect(validateAmount('1000000.00')).toEqual({ ok: true, minor: MAX_SINGLE_AMOUNT })
  })
})
