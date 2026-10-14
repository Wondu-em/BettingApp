import type { Bet } from '../api/types'
import { betPayoutText } from '../lib/bets'
import { formatDateTime } from '../lib/format'
import { BET_TONE } from '../lib/labels'
import { formatAmount } from '../lib/money'
import { Pill } from './Pill'

interface Props {
  bets: Bet[]
  describe: (bet: Bet) => { title: string; pick: string }
  showDate?: boolean
}

export function BetsTable({ bets, describe, showDate = false }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr className="border-b border-line">
            <th className="px-3 py-2 font-semibold">Event</th>
            <th className="px-3 py-2 font-semibold">Pick</th>
            {showDate && <th className="px-3 py-2 font-semibold">Placed</th>}
            <th className="px-3 py-2 text-right font-semibold">Stake</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 text-right font-semibold">Payout</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => {
            const { title, pick } = describe(bet)
            return (
              <tr key={bet.id} className="border-b border-line last:border-0">
                <td className="px-3 py-3">{title}</td>
                <td className="px-3 py-3 whitespace-nowrap">{pick}</td>
                {showDate && <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(bet.placedAt)}</td>}
                <td className="px-3 py-3 text-right tabular-nums">{formatAmount(bet.stake)}</td>
                <td className="px-3 py-3">
                  <Pill tone={BET_TONE[bet.status]}>{bet.status}</Pill>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{betPayoutText(bet)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
