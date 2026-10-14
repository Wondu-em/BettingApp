import { api } from './client'
import type {
  AdminAuditEntry,
  AdminDeposit,
  AdminOverview,
  AdminUser,
  AdminWebhookDelivery,
  BettingEvent,
  Paged,
  ProviderDepositStatus,
  SettlementResult,
  UserRole,
  VoidResult,
} from './types'

type ListFilters = { page: number; pageSize: number }

function queryString(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const adminApi = {
  overview: () => api<AdminOverview>('/admin/overview'),

  users: (filters: ListFilters & { search?: string; role?: UserRole }) =>
    api<Paged<AdminUser>>(`/admin/users${queryString(filters)}`),

  audit: (filters: ListFilters & { action?: string; entityType?: string; actorId?: string }) =>
    api<Paged<AdminAuditEntry>>(`/admin/audit${queryString(filters)}`),

  deposits: (filters: ListFilters & { search?: string; status?: ProviderDepositStatus }) =>
    api<Paged<AdminDeposit>>(`/admin/deposits${queryString(filters)}`),

  webhooks: (filters: ListFilters & { providerEventId?: string; eventType?: string }) =>
    api<Paged<AdminWebhookDelivery>>(`/admin/webhooks${queryString(filters)}`),

  createEvent: (title: string, outcomes: { name: string; odds: number }[]) =>
    api<BettingEvent>('/admin/events', { method: 'POST', body: { title, outcomes } }),

  /** Repeatable: closing an already-closed event is a harmless no-op on the server. */
  closeEvent: (eventId: string) => api<BettingEvent>(`/admin/events/${eventId}/close`, { method: 'POST' }),

  settleEvent: (eventId: string, winningOutcomeId: string, idempotencyKey: string) =>
    api<SettlementResult>(`/admin/events/${eventId}/settle`, {
      method: 'POST',
      body: { winningOutcomeId },
      idempotencyKey,
    }),

  voidEvent: (eventId: string, reason: string | undefined, idempotencyKey: string) =>
    api<VoidResult>(`/admin/events/${eventId}/void`, { method: 'POST', body: { reason }, idempotencyKey }),
}
