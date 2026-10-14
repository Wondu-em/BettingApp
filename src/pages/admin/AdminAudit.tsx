import { useState, type FormEvent } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import type { AdminUser } from '../../api/types'
import { Button } from '../../components/Button'
import { AdminFilterSelect, AdminListPanel } from '../../components/admin/AdminListPanel'
import { ErrorBanner } from '../../components/ErrorBanner'
import { PageHeader } from '../../components/PageHeader'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 20
const ACTOR_PAGE_SIZE = 100

const ACTIONS = [
  'bet.place',
  'deposit.confirmed',
  'deposit.failed',
  'deposit.pending',
  'event.close',
  'event.create',
  'event.settle',
  'event.void',
  'user.login',
  'user.register',
  'wallet.deposit',
  'wallet.withdraw',
]

const ENTITY_TYPES = ['bet', 'event', 'ledger_transaction', 'provider_deposit', 'user']

async function listAllActors(): Promise<AdminUser[]> {
  const actors: AdminUser[] = []
  let total = 0
  let page = 1

  do {
    const result = await adminApi.users({ page, pageSize: ACTOR_PAGE_SIZE })
    actors.push(...result.items)
    total = result.total
    if (result.items.length === 0) break
    page += 1
  } while (actors.length < total)

  return actors.sort((a, b) => a.email.localeCompare(b.email))
}

function formatData(data: string): string {
  try {
    return JSON.stringify(JSON.parse(data) as unknown, null, 2)
  } catch {
    return data
  }
}

export function AdminAudit() {
  const [draft, setDraft] = useState({ action: '', entityType: '', actorId: '' })
  const [filters, setFilters] = useState(draft)
  const [page, setPage] = useState(1)

  const actors = useQuery({
    queryKey: ['admin', 'audit', 'actors'],
    queryFn: listAllActors,
    staleTime: 60_000,
  })

  const audit = useQuery({
    queryKey: ['admin', 'audit', filters, page],
    queryFn: () => adminApi.audit({
      action: filters.action,
      entityType: filters.entityType,
      actorId: filters.actorId,
      page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters({
      action: draft.action.trim(),
      entityType: draft.entityType.trim(),
      actorId: draft.actorId.trim(),
    })
    setPage(1)
  }

  return (
    <>
      <PageHeader title="Audit log" />
      <form onSubmit={submit} className="mb-5 flex flex-wrap items-end gap-3">
        <AdminFilterSelect
          label="Action"
          value={draft.action}
          onChange={(action) => setDraft((current) => ({ ...current, action }))}
          options={[
            { value: '', label: 'All actions' },
            ...ACTIONS.map((action) => ({ value: action, label: action })),
          ]}
        />
        <AdminFilterSelect
          label="Entity type"
          value={draft.entityType}
          onChange={(entityType) => setDraft((current) => ({ ...current, entityType }))}
          options={[
            { value: '', label: 'All entity types' },
            ...ENTITY_TYPES.map((entityType) => ({ value: entityType, label: entityType })),
          ]}
        />
        <AdminFilterSelect
          label="Actor ID"
          value={draft.actorId}
          onChange={(actorId) => setDraft((current) => ({ ...current, actorId }))}
          options={[
            {
              value: '',
              label: actors.isLoading ? 'Loading actors…' : 'All actors',
            },
            ...(actors.data ?? []).map((actor) => ({
              value: actor.id,
              label: `${actor.email} (${actor.id})`,
            })),
          ]}
        />
        {actors.isError && (
          <div className="w-full space-y-2">
            <ErrorBanner error={actors.error} />
            <Button variant="secondary" onClick={() => void actors.refetch()}>
              Retry loading actors
            </Button>
          </div>
        )}
        <Button type="submit">
          Filter
        </Button>
      </form>

      <AdminListPanel
        title="Audit entries"
        total={audit.data?.total}
        page={page}
        pageSize={PAGE_SIZE}
        isLoading={audit.isLoading}
        error={audit.error}
        onRetry={() => void audit.refetch()}
        onPageChange={setPage}
        emptyMessage="No audit entries match these filters."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Actor</th>
                <th className="px-3 py-2 font-semibold">Entity</th>
                <th className="px-3 py-2 font-semibold">Details</th>
                <th className="px-3 py-2 font-semibold">Correlation ID</th>
              </tr>
            </thead>
            <tbody>
              {audit.data?.items.map((entry) => (
                <tr key={entry.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(entry.at)}</td>
                  <td className="px-3 py-3 font-semibold">{entry.action}</td>
                  <td className="px-3 py-3">
                    <div>{entry.actorEmail ?? 'System / provider'}</div>
                    {entry.actorId && <div className="mt-1 font-mono text-xs text-muted">{entry.actorId}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <div>{entry.entityType}</div>
                    {entry.entityId && <div className="mt-1 font-mono text-xs text-muted">{entry.entityId}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <details>
                      <summary className="cursor-pointer font-semibold text-brand">View</summary>
                      <pre className="mt-2 max-w-xl overflow-auto whitespace-pre-wrap break-all rounded-lg bg-page p-3 text-xs">
                        {formatData(entry.data)}
                      </pre>
                    </details>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted">{entry.correlationId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminListPanel>
    </>
  )
}
