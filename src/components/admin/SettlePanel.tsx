import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import { ApiError } from '../../api/client'
import type { BettingEvent, SettlementResult } from '../../api/types'
import { useIdempotencyKey } from '../../lib/idempotency'
import { formatOdds } from '../../lib/payout'
import { Button } from '../Button'
import { Card } from '../Card'
import { ErrorBanner } from '../ErrorBanner'

interface Props {
  event: BettingEvent
  onCancel: () => void
  onDone: (result: SettlementResult) => void
}

/** Settlement is final, so the winner must be chosen explicitly (no preselected default). */
export function SettlePanel({ event, onCancel, onDone }: Props) {
  const queryClient = useQueryClient()
  const key = useIdempotencyKey()
  const [winnerId, setWinnerId] = useState('')

  const settle = useMutation({
    mutationFn: ({ outcomeId, idempotencyKey }: { outcomeId: string; idempotencyKey: string }) =>
      adminApi.settleEvent(event.id, outcomeId, idempotencyKey),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      onDone(result)
    },
    onError: (error) => {
      // 409: someone else already settled/voided it. Refresh so the table shows the truth.
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const stillClosed = event.status === 'Closed'

  return (
    <Card className="border-warn-fg/60">
      <h2 className="text-lg font-bold text-ink">Settle: {event.title}</h2>
      <p className="mt-1 text-sm text-muted">
        Settlement is final and can run only once. Winners are paid stake x odds; all other bets are marked lost.
      </p>

      <label htmlFor="winner" className="mt-4 mb-1.5 block text-sm font-semibold text-ink">
        Winning outcome
      </label>
      <div className="flex flex-wrap gap-3">
        <select
          id="winner"
          value={winnerId}
          onChange={(e) => {
            setWinnerId(e.target.value)
            key.rotate() // a different winner is a different intent
            settle.reset()
          }}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="">Choose the winner…</option>
          {event.outcomes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} @ {formatOdds(o.oddsBp)}
            </option>
          ))}
        </select>
        <Button
          disabled={!winnerId || settle.isPending || !stillClosed}
          onClick={() => settle.mutate({ outcomeId: winnerId, idempotencyKey: key.current() })}
        >
          {settle.isPending ? 'Settling…' : 'Confirm settlement'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {!stillClosed && <p className="mt-3 text-sm font-semibold text-warn-fg">This event is now {event.status}.</p>}
      <div className="mt-3">
        <ErrorBanner error={settle.error} />
      </div>
    </Card>
  )
}
