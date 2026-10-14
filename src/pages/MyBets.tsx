import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { betsApi } from '../api/bets'
import type { BetStatus } from '../api/types'
import { BetsTable } from '../components/BetsTable'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { useBetDescriber, useEvents } from '../lib/useEvents'

const PAGE_SIZE = 10
const STATUSES: BetStatus[] = ['Placed', 'Won', 'Lost', 'Refunded']

export function MyBets() {
  const [status, setStatus] = useState<BetStatus | ''>('')
  const [page, setPage] = useState(1)

  const events = useEvents()
  const bets = useQuery({
    queryKey: ['bets', status || 'all', page, PAGE_SIZE],
    queryFn: () => betsApi.list({ status: status || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const describe = useBetDescriber(events.data?.items)
  const pageCount = Math.max(1, Math.ceil((bets.data?.total ?? 0) / PAGE_SIZE))

  return (
    <>
      <PageHeader title="My bets" />

      <Card>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-semibold text-ink">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as BetStatus | '')
                setPage(1)
              }}
              className="rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {bets.data && <p className="text-sm text-muted">{bets.data.total} bets</p>}
        </div>

        {bets.isError && !bets.data ? (
          <div className="space-y-3">
            <ErrorBanner error={bets.error} />
            <Button variant="secondary" onClick={() => void bets.refetch()}>
              Retry
            </Button>
          </div>
        ) : bets.data && bets.data.items.length === 0 ? (
          <p className="py-4 text-sm text-muted">
            {status ? `No ${status.toLowerCase()} bets.` : 'You have not placed any bets yet.'}
          </p>
        ) : bets.data ? (
          <BetsTable bets={bets.data.items} describe={describe} showDate />
        ) : (
          <p className="py-4 text-sm text-muted">Loading…</p>
        )}

        {bets.data && bets.data.total > 0 && <Pagination page={page} pageCount={pageCount} onChange={setPage} />}
      </Card>
    </>
  )
}
