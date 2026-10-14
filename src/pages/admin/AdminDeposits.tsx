import { useState, type FormEvent } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import type { ProviderDepositStatus } from '../../api/types'
import { Button } from '../../components/Button'
import { AdminFilterInput, AdminFilterSelect, AdminListPanel } from '../../components/admin/AdminListPanel'
import { PageHeader } from '../../components/PageHeader'
import { Pill, type PillTone } from '../../components/Pill'
import { formatDateTime } from '../../lib/format'
import { formatEtb } from '../../lib/money'

const PAGE_SIZE = 20

const DEPOSIT_TONE: Record<ProviderDepositStatus, PillTone> = {
  Pending: 'warn',
  Confirmed: 'ok',
  Failed: 'bad',
}

export function AdminDeposits() {
  const [depositSearchDraft, setDepositSearchDraft] = useState('')
  const [depositSearch, setDepositSearch] = useState('')
  const [status, setStatus] = useState<ProviderDepositStatus | ''>('')
  const [depositPage, setDepositPage] = useState(1)
  const [eventIdDraft, setEventIdDraft] = useState('')
  const [eventTypeDraft, setEventTypeDraft] = useState('')
  const [webhookFilters, setWebhookFilters] = useState({ providerEventId: '', eventType: '' })
  const [webhookPage, setWebhookPage] = useState(1)

  const deposits = useQuery({
    queryKey: ['admin', 'deposits', depositSearch, status, depositPage],
    queryFn: () => adminApi.deposits({
      search: depositSearch,
      status: status || undefined,
      page: depositPage,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  })

  const webhooks = useQuery({
    queryKey: ['admin', 'webhooks', webhookFilters, webhookPage],
    queryFn: () => adminApi.webhooks({ ...webhookFilters, page: webhookPage, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  function submitDeposits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDepositSearch(depositSearchDraft.trim())
    setDepositPage(1)
  }

  function submitWebhooks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWebhookFilters({ providerEventId: eventIdDraft.trim(), eventType: eventTypeDraft.trim() })
    setWebhookPage(1)
  }

  return (
    <>
      <PageHeader title="Deposits & webhooks" />

      <form onSubmit={submitDeposits} className="mb-5 flex flex-wrap items-end gap-3">
        <AdminFilterInput
          label="Search deposits"
          value={depositSearchDraft}
          onChange={setDepositSearchDraft}
          placeholder="Provider reference or user email"
        />
        <AdminFilterSelect
          label="Deposit status"
          value={status}
          onChange={(value) => {
            setStatus(value === 'Pending' || value === 'Confirmed' || value === 'Failed' ? value : '')
            setDepositPage(1)
          }}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Confirmed', label: 'Confirmed' },
            { value: 'Failed', label: 'Failed' },
          ]}
        />
        <Button type="submit">
          Search deposits
        </Button>
      </form>

      <AdminListPanel
        title="Provider deposits"
        total={deposits.data?.total}
        page={depositPage}
        pageSize={PAGE_SIZE}
        isLoading={deposits.isLoading}
        error={deposits.error}
        onRetry={() => void deposits.refetch()}
        onPageChange={setDepositPage}
        emptyMessage="No provider deposits match these filters."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-3 py-2 font-semibold">Provider reference</th>
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold">Amount</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Created</th>
                <th className="px-3 py-2 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {deposits.data?.items.map((deposit) => (
                <tr key={deposit.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 font-mono text-xs">{deposit.providerReference}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold">{deposit.userEmail}</div>
                    <div className="mt-1 font-mono text-xs text-muted">{deposit.userId}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">{formatEtb(deposit.amount)}</td>
                  <td className="px-3 py-3">
                    <Pill tone={DEPOSIT_TONE[deposit.status]}>{deposit.status}</Pill>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(deposit.createdAt)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(deposit.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminListPanel>

      <form onSubmit={submitWebhooks} className="mb-5 mt-8 flex flex-wrap items-end gap-3">
        <AdminFilterInput
          label="Provider event ID"
          value={eventIdDraft}
          onChange={setEventIdDraft}
        />
        <AdminFilterInput
          label="Event type"
          value={eventTypeDraft}
          onChange={setEventTypeDraft}
          placeholder="deposit.confirmed"
        />
        <Button type="submit">
          Search webhooks
        </Button>
      </form>

      <AdminListPanel
        title="Webhook deliveries"
        total={webhooks.data?.total}
        page={webhookPage}
        pageSize={PAGE_SIZE}
        isLoading={webhooks.isLoading}
        error={webhooks.error}
        onRetry={() => void webhooks.refetch()}
        onPageChange={setWebhookPage}
        emptyMessage="No webhook deliveries match these filters."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-3 py-2 font-semibold">Received</th>
                <th className="px-3 py-2 font-semibold">Provider event ID</th>
                <th className="px-3 py-2 font-semibold">Event type</th>
                <th className="px-3 py-2 font-semibold">Result</th>
                <th className="px-3 py-2 font-semibold">Processed</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.data?.items.map((delivery) => (
                <tr key={delivery.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(delivery.receivedAt)}</td>
                  <td className="px-3 py-3 font-mono text-xs">{delivery.providerEventId}</td>
                  <td className="px-3 py-3">{delivery.eventType}</td>
                  <td className="px-3 py-3">{delivery.result ?? '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {delivery.processedAt ? formatDateTime(delivery.processedAt) : 'Not processed'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminListPanel>
    </>
  )
}
