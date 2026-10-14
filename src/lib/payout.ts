/** Odds are integer basis points: 2.10 => 21_000 (scale 10_000). */
export const ODDS_SCALE = 10_000

/**
 * Mirrors the server: payout = floor(stake * oddsBp / 10_000), rounded down in the house's favour.
 * With stake <= 1e8 and odds <= 1e7 the product stays below 2^53, so plain numbers are exact.
 */
export function potentialPayout(stakeMinor: number, oddsBp: number): number {
  if (!Number.isFinite(stakeMinor) || !Number.isFinite(oddsBp) || stakeMinor <= 0 || oddsBp <= 0) return 0
  return Math.floor((stakeMinor * oddsBp) / ODDS_SCALE)
}

/** 21000 -> "2.10" */
export function formatOdds(oddsBp: number): string {
  return (oddsBp / ODDS_SCALE).toFixed(2)
}
