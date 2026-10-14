import type { Bet } from '../api/types'
import { formatAmount } from './money'

/** The Payout column in the design: pending "-", lost "0.00", won the payout, refunded the stake back. */
export function betPayoutText(bet: Bet): string {
  switch (bet.status) {
    case 'Placed':
      return '-'
    case 'Won':
      return formatAmount(bet.payout ?? 0)
    case 'Lost':
      return formatAmount(0)
    case 'Refunded':
      return formatAmount(bet.stake)
  }
}
