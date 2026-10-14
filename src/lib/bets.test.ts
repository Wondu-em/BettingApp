import { describe, expect, it } from 'vitest'
import { betPayoutText } from './bets'
import { EV_AB, bet } from '../test/fixtures'

const o = EV_AB.outcomes[0]

describe('betPayoutText (Payout column in the design)', () => {
  it('shows "-" while the bet is still open', () => {
    expect(betPayoutText(bet('b', EV_AB, o, 10_000, 'Placed', null))).toBe('-')
  })
  it('shows the payout for a won bet', () => {
    expect(betPayoutText(bet('b', EV_AB, o, 5_000, 'Won', 17_000))).toBe('170.00')
  })
  it('shows 0.00 for a lost bet', () => {
    expect(betPayoutText(bet('b', EV_AB, o, 8_000, 'Lost', 0))).toBe('0.00')
  })
  it('shows the stake back for a refunded bet even though the server stores no payout', () => {
    expect(betPayoutText(bet('b', EV_AB, o, 6_000, 'Refunded', null))).toBe('60.00')
  })
})
