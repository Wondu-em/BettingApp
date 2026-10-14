import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { betsApi } from '../api/bets'
import { walletApi } from '../api/wallet'
import { BetSlip } from '../components/BetSlip'
import { BetsTable } from '../components/BetsTable'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorBanner } from '../components/ErrorBanner'
import { EventCard } from '../components/EventCard'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { useBetDescriber, useEvents } from '../lib/useEvents'
import { useDelayedFlag } from '../lib/useDelayedFlag'
import { Link } from 'react-router-dom'

const RECENT_BETS = 5

export function Events() {
  const events = useEvents()
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: walletApi.balance })
  const recent = useQuery({
    queryKey: ['bets', 'all', 1, RECENT_BETS],
    queryFn: () => betsApi.list({ page: 1, pageSize: RECENT_BETS }),
  })
  const [selection, setSelection] = useState<{ eventId: string; outcomeId: string } | null>(null)

  const describe = useBetDescriber(events.data?.items)
  const waking = useDelayedFlag(events.isLoading, 4000)

  // Only Open and Closed events are shown here; settled and voided ones show up through "My bets".
  const visible = (events.data?.items ?? [])
    .filter((e) => e.status === 'Open' || e.status === 'Closed')
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'Open' ? -1 : 1))

  // Derived, so a selection disappears by itself when the event closes (e.g. after a 409 refetch).
  const selectedEvent = visible.find((e) => e.id === selection?.eventId && e.status === 'Open') ?? null
  const selectedOutcome = selectedEvent?.outcomes.find((o) => o.id === selection?.outcomeId) ?? null

  return (
    <>
      <PageHeader title="Events & bets" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {events.isLoading && (
            <Card>
              <p className="text-sm text-muted">Loading events…</p>
              {waking && (
                <div className="mt-2">
                  <Notice tone="warn">The server may be waking up after a period of inactivity. This can take up to a minute.</Notice>
                </div>
              )}
            </Card>
          )}

          {events.isError && (
            <Card className="space-y-3">
              <ErrorBanner error={events.error} />
              <Button variant="secondary" onClick={() => void events.refetch()}>
                Retry
              </Button>
            </Card>
          )}

          {events.data && visible.length === 0 && (
            <Card>
              <p className="text-sm text-muted">There are no events to bet on right now.</p>
            </Card>
          )}

          {visible.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              selectedOutcomeId={selection?.eventId === event.id ? selection.outcomeId : null}
              onSelect={(e, outcomeId) => setSelection({ eventId: e.id, outcomeId })}
            />
          ))}

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">My bets</h2>
              <Link to="/bets" className="text-sm font-semibold text-brand underline-offset-2 hover:underline">
                View all
              </Link>
            </div>
            {recent.isError ? (
              <ErrorBanner error={recent.error} />
            ) : recent.data && recent.data.items.length === 0 ? (
              <p className="text-sm text-muted">You have not placed any bets yet.</p>
            ) : recent.data ? (
              <BetsTable bets={recent.data.items} describe={describe} />
            ) : (
              <p className="text-sm text-muted">Loading…</p>
            )}
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <BetSlip
            key={selectedOutcome?.id ?? 'none'}
            event={selectedEvent}
            outcome={selectedOutcome}
            balance={wallet.data?.balance}
          />
        </div>
      </div>
    </>
  )
}
