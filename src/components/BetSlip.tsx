import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { betsApi } from '../api/bets'
import { ApiError } from '../api/client'
import type { BettingEvent, Outcome, WalletBalance } from '../api/types'
import { describeError } from '../lib/errors'
import { useIdempotencyKey } from '../lib/idempotency'
import { formatEtb, parseEtb, validateAmount } from '../lib/money'
import { formatOdds, potentialPayout } from '../lib/payout'
import { useCountdown } from '../lib/useCountdown'
import { Button } from './Button'
import { Card } from './Card'
import { ErrorBanner } from './ErrorBanner'
import { Notice } from './Notice'

interface Props {
  event: BettingEvent | null
  outcome: Outcome | null
  balance: number | undefined
}

/**
 * Remount this component (key={outcome.id}) when the pick changes: a different pick is a different intent,
 * so the stake, messages and Idempotency-Key all start fresh.
 */
export function BetSlip({ event, outcome, balance }: Props) {
  const queryClient = useQueryClient()
  const [stakeText, setStakeText] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const key = useIdempotencyKey()
  const cooldown = useCountdown()

  const place = useMutation({
    mutationFn: ({ outcomeId, stake, idempotencyKey }: { outcomeId: string; stake: number; idempotencyKey: string }) =>
      betsApi.place(outcomeId, stake, idempotencyKey),
    onSuccess: (result) => {
      queryClient.setQueryData<WalletBalance>(['wallet'], (old) => (old ? { ...old, balance: result.balance } : old))
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['bets'] })
      key.rotate()
      setStakeText('')
      setNotice(`Bet placed for ${formatEtb(result.bet.stake)}. New balance ${formatEtb(result.balance)}.`)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: ['events'] }) // the event probably just closed
      }
      if (error instanceof ApiError && error.code === 'rate_limited') {
        cooldown.start(error.retryAfter ?? 5)
      }
    },
  })

  if (!event || !outcome) {
    return (
      <Card>
        <h2 className="text-lg font-bold text-ink">Bet slip</h2>
        <p className="mt-2 text-sm text-muted">Pick an outcome on an open event to start a bet.</p>
        {balance !== undefined && <p className="mt-4 text-sm text-muted">Balance {formatEtb(balance)}.</p>}
      </Card>
    )
  }

  const stakeMinor = parseEtb(stakeText)
  const payout = stakeMinor ? potentialPayout(stakeMinor, outcome.oddsBp) : 0
  const blocked = cooldown.remaining > 0

  function onStakeChange(value: string) {
    setStakeText(value)
    setFieldError(null)
    setNotice(null)
    key.rotate() // a different stake is a different intent
  }

  function submit() {
    setNotice(null)
    place.reset()
    const check = validateAmount(stakeText)
    if (!check.ok) {
      setFieldError(check.error)
      return
    }
    setFieldError(null)
    place.mutate({ outcomeId: outcome!.id, stake: check.minor, idempotencyKey: key.current() })
  }

  const serverFieldError = place.error ? describeError(place.error).fieldErrors?.stake?.[0] : undefined

  return (
    <Card>
      <h2 className="text-lg font-bold text-ink">Bet slip</h2>
      <p className="mt-3 text-sm text-muted">{event.title}</p>
      <p className="text-lg font-bold text-ink">
        {outcome.name} @ {formatOdds(outcome.oddsBp)}
      </p>

      <label htmlFor="stake" className="mt-4 mb-1.5 block text-sm font-semibold text-ink">
        Stake (ETB)
      </label>
      <input
        id="stake"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={stakeText}
        onChange={(e) => onStakeChange(e.target.value)}
        aria-invalid={fieldError || serverFieldError ? true : undefined}
        className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {(fieldError || serverFieldError) && (
        <p className="mt-1.5 text-xs font-semibold text-bad-fg">{fieldError ?? serverFieldError}</p>
      )}

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-sm text-muted">Potential payout</span>
        <span className="text-lg font-bold text-ink">{formatEtb(payout)}</span>
      </div>

      <Button className="mt-4" fullWidth disabled={place.isPending || blocked} onClick={submit}>
        {blocked ? `Try again in ${cooldown.remaining}s` : place.isPending ? 'Placing…' : 'Place bet'}
      </Button>

      <p className="mt-4 text-sm text-muted">
        {balance !== undefined && <>Balance {formatEtb(balance)}. </>}
        Stake is debited immediately. Rounded down to the nearest santim.
      </p>

      <div className="mt-3 space-y-2">
        {notice && <Notice>{notice}</Notice>}
        <ErrorBanner error={place.error} />
      </div>
    </Card>
  )
}
