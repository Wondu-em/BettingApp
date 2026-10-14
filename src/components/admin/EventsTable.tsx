import type { BettingEvent } from '../../api/types'
import { EVENT_TONE } from '../../lib/labels'
import { Button } from '../Button'
import { Card } from '../Card'
import { Pill } from '../Pill'

interface Props {
  events: BettingEvent[]
  selectedId: string | null
  closingId: string | null
  onSelect: (id: string) => void
  onClose: (event: BettingEvent) => void
  onSettle: (event: BettingEvent) => void
  onVoid: (event: BettingEvent) => void
}

export function EventsTable({ events, selectedId, closingId, onSelect, onClose, onSettle, onVoid }: Props) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold text-ink">Events</h2>
      {events.length === 0 ? (
        <p className="py-3 text-sm text-muted">No events yet. Create the first one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-3 py-2 font-semibold">Event</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Bets</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className={`border-b border-line last:border-0 ${event.id === selectedId ? 'bg-page' : ''}`}
                >
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(event.id)}
                      className="text-left font-semibold text-ink underline-offset-2 hover:underline"
                    >
                      {event.title}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={EVENT_TONE[event.status]}>{event.status}</Pill>
                  </td>
                  <td className="px-3 py-3 text-muted" title="The API does not return a bet count yet">
                    —
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {event.status === 'Open' && (
                        <>
                          <Button
                            variant="secondary"
                            className="px-3 py-1.5 text-sm"
                            disabled={closingId === event.id}
                            aria-label={`Close ${event.title}`}
                            onClick={() => onClose(event)}
                          >
                            {closingId === event.id ? 'Closing…' : 'Close'}
                          </Button>
                          <Button
                            variant="secondary"
                            className="px-3 py-1.5 text-sm"
                            aria-label={`Void ${event.title}`}
                            onClick={() => onVoid(event)}
                          >
                            Void
                          </Button>
                        </>
                      )}
                      {event.status === 'Closed' && (
                        <>
                          <Button
                            className="px-3 py-1.5 text-sm"
                            aria-label={`Settle ${event.title}`}
                            onClick={() => onSettle(event)}
                          >
                            Settle
                          </Button>
                          <Button
                            variant="secondary"
                            className="px-3 py-1.5 text-sm"
                            aria-label={`Void ${event.title}`}
                            onClick={() => onVoid(event)}
                          >
                            Void
                          </Button>
                        </>
                      )}
                      {(event.status === 'Settled' || event.status === 'Voided') && (
                        <span className="py-1.5 text-muted">Final</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
