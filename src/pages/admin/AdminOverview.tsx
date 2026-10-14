import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ErrorBanner } from '../../components/ErrorBanner'
import { PageHeader } from '../../components/PageHeader'
import { formatEtb } from '../../lib/money'

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{value}</p>
    </Card>
  )
}

export function AdminOverview() {
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview })
  const data = overview.data

  return (
    <>
      <PageHeader title="Overview" />

      {overview.isError && !data ? (
        <Card className="space-y-3">
          <ErrorBanner error={overview.error} />
          <Button variant="secondary" onClick={() => void overview.refetch()}>
            Retry
          </Button>
        </Card>
      ) : !data ? (
        <Card>
          <p role="status" className="text-sm text-muted">Loading overview…</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {overview.isError && (
            <Card className="space-y-3">
              <ErrorBanner error={overview.error} />
              <Button variant="secondary" onClick={() => void overview.refetch()}>
                Retry
              </Button>
            </Card>
          )}

          <section aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="mb-3 text-lg font-bold text-ink">Activity</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Users" value={data.totalUsers.toLocaleString()} />
              <Metric label="Events" value={data.totalEvents.toLocaleString()} />
              <Metric label="Total bets" value={data.totalBets.toLocaleString()} />
              <Metric label="Provider deposits" value={data.totalDeposits.toLocaleString()} />
            </div>
          </section>

          <section aria-labelledby="events-heading">
            <h2 id="events-heading" className="mb-3 text-lg font-bold text-ink">Events</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Open" value={data.openEvents.toLocaleString()} />
              <Metric label="Closed" value={data.closedEvents.toLocaleString()} />
              <Metric label="Settled" value={data.settledEvents.toLocaleString()} />
              <Metric label="Voided" value={data.voidedEvents.toLocaleString()} />
            </div>
          </section>

          <section aria-labelledby="bets-heading">
            <h2 id="bets-heading" className="mb-3 text-lg font-bold text-ink">Bets</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Placed" value={data.placedBets.toLocaleString()} />
              <Metric label="Won" value={data.wonBets.toLocaleString()} />
              <Metric label="Lost" value={data.lostBets.toLocaleString()} />
              <Metric label="Refunded" value={data.refundedBets.toLocaleString()} />
            </div>
          </section>

          <section aria-labelledby="deposits-heading">
            <h2 id="deposits-heading" className="mb-3 text-lg font-bold text-ink">Deposits &amp; balances</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Pending deposits" value={data.pendingDeposits.toLocaleString()} />
              <Metric label="Confirmed deposits" value={data.confirmedDeposits.toLocaleString()} />
              <Metric label="Failed deposits" value={data.failedDeposits.toLocaleString()} />
              <Metric label="Confirmed deposit amount" value={formatEtb(data.confirmedDepositAmount)} />
            </div>
            <Card className="mt-4">
              <p className="text-sm font-semibold text-muted">Total user wallet balance</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{formatEtb(data.totalWalletBalance)}</p>
            </Card>
          </section>
        </div>
      )}
    </>
  )
}
