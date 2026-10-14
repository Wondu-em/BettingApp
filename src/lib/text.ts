import type { SettlementResult, VoidResult } from '../api/types'
import { formatEtb } from './money'

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** +ETB 10.00 for a house profit, -ETB 5.00 for a loss. */
export function houseResultText(minor: number): string {
  if (minor === 0) return formatEtb(0)
  return `${minor > 0 ? '+' : '-'}${formatEtb(Math.abs(minor))}`
}

export function settlementSummary(r: SettlementResult): string {
  return (
    `Settled. ${plural(r.winningBets, 'winning bet')}, ${plural(r.losingBets, 'losing bet')}. ` +
    `Paid out ${formatEtb(r.totalPaidOut)} of ${formatEtb(r.totalStaked)} staked. ` +
    `House result: ${houseResultText(r.houseResult)}.`
  )
}

export function voidSummary(r: VoidResult): string {
  return `Voided. ${plural(r.betsRefunded, 'bet')} refunded, ${formatEtb(r.totalRefunded)} returned to players.`
}
