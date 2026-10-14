import { describe, expect, it } from 'vitest'
import { formatDateTime } from './format'
import { TX_LABEL, TX_TONE, describeReference } from './labels'

describe('formatDateTime', () => {
  it('matches the design: "12 Oct, 09:14"', () => {
    expect(formatDateTime('2026-10-12T09:14:00+00:00', 'UTC')).toBe('12 Oct, 09:14')
    expect(formatDateTime('2026-10-13T18:02:30.123Z', 'UTC')).toBe('13 Oct, 18:02')
  })

  it('uses a 24-hour clock and falls back to the raw text for garbage', () => {
    expect(formatDateTime('2026-10-12T00:05:00Z', 'UTC')).toBe('12 Oct, 00:05')
    expect(formatDateTime('not a date')).toBe('not a date')
  })
})

describe('labels', () => {
  it('shortens bet references like the design', () => {
    expect(describeReference('bet', '7f3a9c10-0000-0000-0000-000000000000')).toBe('bet 7f3a…')
    expect(describeReference('withdrawal', 'abc')).toBe('withdrawal')
    expect(describeReference('provider_deposit', null)).toBe('provider_deposit')
    expect(describeReference('bet', null)).toBe('bet')
  })

  it('maps every transaction type to a label and a colour', () => {
    expect(TX_LABEL.BetStake).toBe('Bet stake')
    expect(TX_TONE.Deposit).toBe('ok')
    expect(TX_TONE.Withdraw).toBe('bad')
    expect(TX_TONE.BetStake).toBe('warn')
    expect(TX_TONE.Refund).toBe('neutral')
  })
})
