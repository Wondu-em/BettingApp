import type { PillTone } from '../components/Pill'
import type { BetStatus, EventStatus, TxType } from '../api/types'

export const TX_LABEL: Record<TxType, string> = {
  Deposit: 'Deposit',
  Withdraw: 'Withdraw',
  BetStake: 'Bet stake',
  Payout: 'Payout',
  Refund: 'Refund',
  Sweep: 'Sweep',
}

export const TX_TONE: Record<TxType, PillTone> = {
  Deposit: 'ok',
  Payout: 'ok',
  BetStake: 'warn',
  Refund: 'neutral',
  Withdraw: 'bad',
  Sweep: 'neutral',
}

/** "bet" + id -> "bet 7f3a…"; anything else is shown as the server sent it ("withdrawal", "provider_deposit"). */
export function describeReference(referenceType: string, referenceId: string | null): string {
  if (referenceType === 'bet' && referenceId) return `bet ${referenceId.slice(0, 4)}…`
  return referenceType
}

export const EVENT_TONE: Record<EventStatus, PillTone> = {
  Open: 'ok',
  Closed: 'neutral',
  Settled: 'ok',
  Voided: 'neutral',
}

export const BET_TONE: Record<BetStatus, PillTone> = {
  Placed: 'warn',
  Won: 'ok',
  Lost: 'bad',
  Refunded: 'neutral',
}
