import type { BettingEvent } from '../../api/types'
import { formatDateTime } from '../../lib/format'
import { Card } from '../Card'

/**
 * Built only from what the event itself carries (created time, final state and its time).
 * Who did what and when each step happened needs a status-history endpoint on the API.
 */
export function EventTimeline({ event }: { event: BettingEvent | null }) {
  return (
    <Card>
      <h2 className="mb-2 text-lg font-bold text-ink">Status history</h2>
      {!event ? (
        <p className="text-sm text-muted">Select an event to see its timeline.</p>
      ) : (
        <>
          <p className="mb-2 text-sm font-semibold text-ink">{event.title}</p>
          <ul className="space-y-1 text-sm text-muted">
            <li>Created, {formatDateTime(event.createdAt)}</li>
            {event.status === 'Open' && <li>Currently Open</li>}
            {event.status === 'Closed' && <li>Currently Closed (betting stopped)</li>}
            {event.status === 'Settled' && event.settledAt && <li>Settled, {formatDateTime(event.settledAt)}</li>}
            {event.status === 'Voided' && event.settledAt && <li>Voided, {formatDateTime(event.settledAt)}</li>}
          </ul>
          <p className="mt-3 text-xs text-muted">Who made each change, and when, needs a history endpoint on the API.</p>
        </>
      )}
    </Card>
  )
}
