import type { BettingEvent } from '../api/types'
import { EVENT_TONE } from '../lib/labels'
import { formatOdds } from '../lib/payout'
import { Card } from './Card'
import { Pill } from './Pill'

interface Props {
  event: BettingEvent
  selectedOutcomeId: string | null
  onSelect: (event: BettingEvent, outcomeId: string) => void
}

export function EventCard({ event, selectedOutcomeId, onSelect }: Props) {
  const open = event.status === 'Open'
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{event.title}</h2>
        <Pill tone={EVENT_TONE[event.status]}>{event.status}</Pill>
      </div>

      {open ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {event.outcomes.map((outcome) => {
            const selected = outcome.id === selectedOutcomeId
            return (
              <button
                key={outcome.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(event, outcome.id)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                  selected ? 'border-brand ring-2 ring-brand/30' : 'border-line hover:border-brand/60'
                } bg-white text-ink`}
              >
                {outcome.name} {formatOdds(outcome.oddsBp)}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Betting is closed. Awaiting settlement.</p>
      )}
    </Card>
  )
}
