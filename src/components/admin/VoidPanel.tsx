import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import { ApiError } from '../../api/client'
import type { BettingEvent, VoidResult } from '../../api/types'
import { useIdempotencyKey } from '../../lib/idempotency'
import { Button } from '../Button'
import { Card } from '../Card'
import { ErrorBanner } from '../ErrorBanner'

interface Props {
  event: BettingEvent
  onCancel: () => void
  onDone: (result: VoidResult) => void
}

export function VoidPanel({ event, onCancel, onDone }: Props) {
  const queryClient = useQueryClient()
  const key = useIdempotencyKey()
  const [reason, setReason] = useState('')

  const voidEvent = useMutation({
    mutationFn: ({ text, idempotencyKey }: { text: string; idempotencyKey: string }) =>
      adminApi.voidEvent(event.id, text.trim() === '' ? undefined : text.trim(), idempotencyKey),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      onDone(result)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const voidable = event.status === 'Open' || event.status === 'Closed'

  return (
    <Card className="border-bad-fg/60">
      <h2 className="text-lg font-bold text-ink">Void: {event.title}</h2>
      <p className="mt-1 text-sm text-muted">
        Voiding refunds every stake in full and cannot be undone. Use it when the event will not be settled.
      </p>

      <label htmlFor="void-reason" className="mt-4 mb-1.5 block text-sm font-semibold text-ink">
        Reason (optional)
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          id="void-reason"
          maxLength={500}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            key.rotate() // a different reason is a different request body
            voidEvent.reset()
          }}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <Button
          variant="danger"
          disabled={voidEvent.isPending || !voidable}
          onClick={() => voidEvent.mutate({ text: reason, idempotencyKey: key.current() })}
        >
          {voidEvent.isPending ? 'Voiding…' : 'Confirm void'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {!voidable && <p className="mt-3 text-sm font-semibold text-warn-fg">This event is now {event.status}.</p>}
      <div className="mt-3">
        <ErrorBanner error={voidEvent.error} />
      </div>
    </Card>
  )
}
