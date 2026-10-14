import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, renderApp, signInAs } from '../../test/helpers'
import { mockApi } from '../../test/mockApi'

const overview = {
  totalUsers: 12,
  totalEvents: 8,
  openEvents: 2,
  closedEvents: 1,
  settledEvents: 4,
  voidedEvents: 1,
  totalBets: 23,
  placedBets: 3,
  wonBets: 8,
  lostBets: 10,
  refundedBets: 2,
  totalDeposits: 6,
  pendingDeposits: 1,
  confirmedDeposits: 4,
  failedDeposits: 1,
  confirmedDepositAmount: 123450,
  totalWalletBalance: 245600,
}

beforeEach(() => signInAs('Admin'))
afterEach(() => vi.unstubAllGlobals())

describe('Admin overview', () => {
  it('shows the backend summary metrics', async () => {
    mockApi({ 'GET /api/admin/overview': () => jsonResponse(overview) })
    renderApp('/admin')

    expect(await screen.findByText('ETB 1,234.50')).toBeInTheDocument()
    expect(screen.getByText('ETB 2,456.00')).toBeInTheDocument()
    expect(screen.getByText('Total bets')).toBeInTheDocument()
    expect(screen.getByText('Provider deposits')).toBeInTheDocument()
  })
})

describe('Admin users', () => {
  it('filters and renders users without requesting password fields', async () => {
    const { calls } = mockApi({
      'GET /api/admin/users': ({ url }) => {
        expect(url.searchParams.get('search')).toBe('alice@example.test')
        expect(url.searchParams.get('role')).toBe('User')
        return jsonResponse({
          items: [{
            id: 'user-1',
            email: 'alice@example.test',
            role: 'User',
            createdAt: '2026-10-14T08:00:00Z',
            walletBalance: 12500,
            currency: 'ETB',
          }],
          page: 1,
          pageSize: 20,
          total: 1,
        })
      },
    })
    renderApp('/admin/users')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Search email'), 'alice@example.test')
    await user.selectOptions(screen.getByLabelText('Role'), 'User')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('alice@example.test')).toBeInTheDocument()
    expect(screen.getByText('ETB 125.00')).toBeInTheDocument()
    expect(calls.some((call) => call.url.pathname === '/api/admin/users')).toBe(true)
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument()
  })
})

describe('Admin audit log', () => {
  it('filters and shows audit details and actor identity', async () => {
    const { calls } = mockApi({
      'GET /api/admin/users': ({ url }) => {
        const page = Number(url.searchParams.get('page'))
        return jsonResponse({
          items: page === 1 ? [{
            id: 'user-1',
            email: 'user@example.test',
            role: 'User',
            createdAt: '2026-10-14T08:00:00Z',
            walletBalance: 0,
            currency: 'ETB',
          }] : [{
            id: 'actor-1',
            email: 'admin@example.test',
            role: 'Admin',
            createdAt: '2026-10-14T08:00:00Z',
            walletBalance: 0,
            currency: 'ETB',
          }],
          page,
          pageSize: 100,
          total: 2,
        })
      },
      'GET /api/admin/audit': ({ url }) => jsonResponse({
        items: [{
          id: 42,
          actorId: 'actor-1',
          actorEmail: 'admin@example.test',
          action: 'event.close',
          entityType: 'event',
          entityId: 'event-1',
          data: '{"reason":"closed for betting"}',
          correlationId: 'trace-1',
          at: '2026-10-14T08:00:00Z',
        }],
        page: Number(url.searchParams.get('page')),
        pageSize: 20,
        total: 1,
      }),
    })
    renderApp('/admin/audit')
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('Action'), 'event.close')
    await user.selectOptions(screen.getByLabelText('Entity type'), 'event')
    await user.selectOptions(await screen.findByLabelText('Actor ID'), 'actor-1')
    await user.click(screen.getByRole('button', { name: 'Filter' }))

    const row = await screen.findByRole('cell', { name: 'event.close' })
    expect(row).toBeInTheDocument()
    expect(screen.getByText('admin@example.test')).toBeInTheDocument()
    await user.click(screen.getByText('View'))
    expect(screen.getByText(/closed for betting/)).toBeInTheDocument()
    await waitFor(() => {
      const request = calls.at(-1)
      expect(request?.url.searchParams.get('action')).toBe('event.close')
      expect(request?.url.searchParams.get('entityType')).toBe('event')
      expect(request?.url.searchParams.get('actorId')).toBe('actor-1')
      expect(calls.some((call) =>
        call.url.pathname === '/api/admin/users' && call.url.searchParams.get('page') === '2',
      )).toBe(true)
    })
  })
})

describe('Admin deposits and webhooks', () => {
  it('lists filtered deposits and delivery metadata without raw payloads', async () => {
    const { calls } = mockApi({
      'GET /api/admin/deposits': () => jsonResponse({
        items: [{
          id: 'deposit-1',
          providerReference: 'ref-1',
          userId: 'user-1',
          userEmail: 'alice@example.test',
          amount: 5000,
          status: 'Confirmed',
          ledgerTransactionId: 'ledger-1',
          createdAt: '2026-10-14T08:00:00Z',
          updatedAt: '2026-10-14T08:01:00Z',
        }],
        page: 1,
        pageSize: 20,
        total: 1,
      }),
      'GET /api/admin/webhooks': () => jsonResponse({
        items: [{
          id: 'delivery-1',
          providerEventId: 'event-1',
          eventType: 'deposit.confirmed',
          result: 'state_changed',
          receivedAt: '2026-10-14T08:00:00Z',
          processedAt: '2026-10-14T08:00:01Z',
        }],
        page: 1,
        pageSize: 20,
        total: 1,
      }),
    })
    renderApp('/admin/deposits')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Search deposits'), 'ref-1')
    await user.selectOptions(screen.getByLabelText('Deposit status'), 'Confirmed')
    await user.click(screen.getByRole('button', { name: 'Search deposits' }))
    expect(await screen.findByText('alice@example.test')).toBeInTheDocument()
    expect(screen.getByText('ETB 50.00')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Provider event ID'), 'event-1')
    await user.type(screen.getByLabelText('Event type'), 'deposit.confirmed')
    await user.click(screen.getByRole('button', { name: 'Search webhooks' }))

    const webhookId = await screen.findByText('event-1')
    const webhookRow = webhookId.closest('tr')
    expect(webhookRow).not.toBeNull()
    expect(within(webhookRow as HTMLElement).getByText('state_changed')).toBeInTheDocument()
    expect(screen.queryByText(/rawPayload/i)).not.toBeInTheDocument()

    await waitFor(() => {
      const depositRequest = calls.find(
        (call) => call.url.pathname === '/api/admin/deposits' && call.url.searchParams.get('search') === 'ref-1',
      )
      expect(depositRequest?.url.searchParams.get('search')).toBe('ref-1')
      expect(depositRequest?.url.searchParams.get('status')).toBe('Confirmed')
      const webhookRequest = calls.find(
        (call) => call.url.pathname === '/api/admin/webhooks' &&
          call.url.searchParams.get('providerEventId') === 'event-1',
      )
      expect(webhookRequest?.url.searchParams.get('providerEventId')).toBe('event-1')
      expect(webhookRequest?.url.searchParams.get('eventType')).toBe('deposit.confirmed')
    })
  })
})
