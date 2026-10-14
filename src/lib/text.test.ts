import { describe, expect, it } from 'vitest'
import { houseResultText, plural, settlementSummary, voidSummary } from './text'

describe('text helpers', () => {
  it('pluralises', () => {
    expect(plural(1, 'bet')).toBe('1 bet')
    expect(plural(0, 'bet')).toBe('0 bets')
    expect(plural(2, 'winning bet')).toBe('2 winning bets')
  })

  it('signs the house result', () => {
    expect(houseResultText(1_000)).toBe('+ETB 10.00')
    expect(houseResultText(-500)).toBe('-ETB 5.00')
    expect(houseResultText(0)).toBe('ETB 0.00')
  })

  it('summarises a settlement', () => {
    expect(
      settlementSummary({
        eventId: 'e', status: 'Settled', winningOutcomeId: 'o', winningBets: 2, losingBets: 1,
        totalStaked: 7_000, totalPaidOut: 6_000, houseResult: 1_000, settledAt: '',
      }),
    ).toBe('Settled. 2 winning bets, 1 losing bet. Paid out ETB 60.00 of ETB 70.00 staked. House result: +ETB 10.00.')
  })

  it('summarises a void', () => {
    expect(voidSummary({ eventId: 'e', status: 'Voided', betsRefunded: 3, totalRefunded: 7_000, reason: null, voidedAt: '' })).toBe(
      'Voided. 3 bets refunded, ETB 70.00 returned to players.',
    )
  })
})
