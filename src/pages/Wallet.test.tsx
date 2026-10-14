import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletTx } from '../api/types'
import { jsonResponse, renderApp, signInAs } from '../test/helpers'
import { mockApi, posts, type Handler } from '../test/mockApi'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const sample: WalletTx[] = [
  { transactionId: 't5', type: 'Withdraw', direction: 'Debit', amount: 20_000, referenceType: 'withdrawal', referenceId: null, createdAt: '2026-10-13T10:05:00+00:00' },
  { transactionId: 't4', type: 'Refund', direction: 'Credit', amount: 5_000, referenceType: 'bet', referenceId: 'c21e0000-0000-0000-0000-000000000000', createdAt: '2026-10-13T08:40:00+00:00' },
  { transactionId: 't3', type: 'Payout', direction: 'Credit', amount: 25_000, referenceType: 'bet', referenceId: '7f3a0000-0000-0000-0000-000000000000', createdAt: '2026-10-12T18:02:00+00:00' },
  { transactionId: 't2', type: 'BetStake', direction: 'Debit', amount: 10_000, referenceType: 'bet', referenceId: '7f3a0000-0000-0000-0000-000000000000', createdAt: '2026-10-12T09:31:00+00:00' },
  { transactionId: 't1', type: 'Deposit', direction: 'Credit', amount: 50_000, referenceType: 'provider_deposit', referenceId: null, createdAt: '2026-10-12T09:14:00+00:00' },
]

/** A tiny in-memory backend: balance + history that deposits/withdrawals really change. */
function fakeBackend(initialBalance = 125_000, history: WalletTx[] = sample) {
  let balance = initialBalance
  const txs = [...history]

  const routes: Record<string, Handler> = {
    'GET /api/wallet': () => jsonResponse({ walletId: 'w1', balance, currency: 'ETB' }),
    'GET /api/wallet/transactions': ({ url }) => {
      const page = Number(url.searchParams.get('page'))
      const size = Number(url.searchParams.get('pageSize'))
      return jsonResponse({ items: txs.slice((page - 1) * size, page * size), page, pageSize: size, total: txs.length })
    },
    'POST /api/wallet/deposit': ({ body }) => {
      balance += body.amount
      txs.unshift({ transactionId: `d${txs.length}`, type: 'Deposit', direction: 'Credit', amount: body.amount, referenceType: 'deposit', referenceId: null, createdAt: '2026-10-14T08:00:00+00:00' })
      return jsonResponse({ transactionId: 'new', amount: body.amount, balance }, 201)
    },
    'POST /api/wallet/withdraw': ({ body }) => {
      balance -= body.amount
      return jsonResponse({ transactionId: 'new', amount: body.amount, balance }, 201)
    },
  }
  return { routes, txs }
}

beforeEach(() => signInAs('User'))
afterEach(() => vi.unstubAllGlobals())

async function amount(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = await screen.findByLabelText('Amount (ETB)')
  await user.clear(input)
  await user.type(input, text)
  return input
}

describe('Wallet page', () => {
  it('shows the balance and the transaction history like the design', async () => {
    mockApi(fakeBackend().routes)
    renderApp('/wallet')

    expect(await screen.findByText('ETB 1,250.00')).toBeInTheDocument()
    expect(screen.getByText(/integer minor units \(125,000\)/)).toBeInTheDocument()

    const table = await screen.findByRole('table')
    expect(within(table).getByText('+500.00')).toBeInTheDocument()
    expect(within(table).getByText('-100.00')).toBeInTheDocument()
    expect(within(table).getByText('+250.00')).toBeInTheDocument()
    expect(within(table).getByText('-200.00')).toBeInTheDocument()
    expect(within(table).getByText('Bet stake')).toBeInTheDocument()
    expect(within(table).getByText('Payout')).toBeInTheDocument()
    expect(within(table).getByText('provider_deposit')).toBeInTheDocument()
    expect(within(table).getByText('withdrawal')).toBeInTheDocument()
    expect(within(table).getAllByText('bet 7f3a…')).toHaveLength(2)
    expect(within(table).getByText('bet c21e…')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('deposits: sends integer minor units with an Idempotency-Key, then refreshes balance and history', async () => {
    const { calls } = mockApi(fakeBackend().routes)
    renderApp('/wallet')
    const user = userEvent.setup()

    const input = await amount(user, '500.00')
    await user.click(screen.getByRole('button', { name: 'Deposit' }))

    expect(await screen.findByText('ETB 1,750.00')).toBeInTheDocument()
    const [call] = posts(calls, 'POST /api/wallet/deposit')
    expect(call.body).toEqual({ amount: 50_000 })
    expect(call.init.headers['Idempotency-Key']).toMatch(UUID)
    expect(call.init.headers.Authorization).toMatch(/^Bearer /)

    expect(screen.getByRole('status')).toHaveTextContent('Deposited ETB 500.00. New balance ETB 1,750.00.')
    expect(input).toHaveValue('')
    expect(await screen.findByText('deposit')).toBeInTheDocument() // the new row in the history
  })

  it('withdraws', async () => {
    const { calls } = mockApi(fakeBackend().routes)
    renderApp('/wallet')
    const user = userEvent.setup()

    await amount(user, '200')
    await user.click(screen.getByRole('button', { name: 'Withdraw' }))

    expect(await screen.findByText('ETB 1,050.00')).toBeInTheDocument()
    expect(posts(calls, 'POST /api/wallet/withdraw')[0].body).toEqual({ amount: 20_000 })
  })

  it('reuses the SAME key when the user retries after a network failure, and a NEW key for the next deposit', async () => {
    const backend = fakeBackend()
    const { calls } = mockApi(backend.routes)
    const realDeposit = backend.routes['POST /api/wallet/deposit']
    let attempts = 0
    backend.routes['POST /api/wallet/deposit'] = (req) => {
      attempts++
      if (attempts === 1) throw new TypeError('Failed to fetch')
      return realDeposit(req)
    }

    renderApp('/wallet')
    const user = userEvent.setup()
    await amount(user, '500')
    const deposit = screen.getByRole('button', { name: 'Deposit' })

    await user.click(deposit)
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')

    await user.click(deposit) // retry the very same attempt
    expect(await screen.findByRole('status')).toHaveTextContent('Deposited')

    const [first, retry] = posts(calls, 'POST /api/wallet/deposit')
    expect(retry.init.headers['Idempotency-Key']).toBe(first.init.headers['Idempotency-Key'])

    await amount(user, '10') // a new intent after success
    await user.click(deposit)
    await waitFor(() => expect(posts(calls, 'POST /api/wallet/deposit')).toHaveLength(3))
    const third = posts(calls, 'POST /api/wallet/deposit')[2]
    expect(third.init.headers['Idempotency-Key']).not.toBe(first.init.headers['Idempotency-Key'])
  })

  it('uses a NEW key when the amount is edited after a failed attempt', async () => {
    const backend = fakeBackend()
    const { calls } = mockApi(backend.routes)
    const realDeposit = backend.routes['POST /api/wallet/deposit']
    let attempts = 0
    backend.routes['POST /api/wallet/deposit'] = (req) => {
      if (++attempts === 1) throw new TypeError('Failed to fetch')
      return realDeposit(req)
    }

    renderApp('/wallet')
    const user = userEvent.setup()
    await amount(user, '500')
    await user.click(screen.getByRole('button', { name: 'Deposit' }))
    await screen.findByRole('alert')

    await amount(user, '600') // changed the amount => different intent
    await user.click(screen.getByRole('button', { name: 'Deposit' }))
    await screen.findByRole('status')

    const [first, second] = posts(calls, 'POST /api/wallet/deposit')
    expect(first.body).toEqual({ amount: 50_000 })
    expect(second.body).toEqual({ amount: 60_000 })
    expect(second.init.headers['Idempotency-Key']).not.toBe(first.init.headers['Idempotency-Key'])
  })

  it('shows insufficient funds in red and keeps the typed amount', async () => {
    const backend = fakeBackend()
    mockApi(backend.routes)
    backend.routes['POST /api/wallet/withdraw'] = () =>
      jsonResponse({ code: 'insufficient_funds', title: 'Insufficient funds', detail: 'x' }, 422)

    renderApp('/wallet')
    const user = userEvent.setup()
    const input = await amount(user, '99999')
    await user.click(screen.getByRole('button', { name: 'Withdraw' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient funds')
    expect(screen.getByRole('alert')).toHaveTextContent('422')
    expect(input).toHaveValue('99999')
    expect(screen.getByText('ETB 1,250.00')).toBeInTheDocument() // balance unchanged
  })

  it('rejects malformed amounts locally without calling the API', async () => {
    const { calls } = mockApi(fakeBackend().routes)
    renderApp('/wallet')
    const user = userEvent.setup()

    await amount(user, '12.505')
    await user.click(screen.getByRole('button', { name: 'Deposit' }))

    expect(await screen.findByText(/at most 2 decimals/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Amount (ETB)')).toHaveAttribute('aria-invalid', 'true')
    expect(calls.filter((c) => c.init.method === 'POST')).toHaveLength(0)

    await user.clear(screen.getByLabelText('Amount (ETB)'))
    await user.click(screen.getByRole('button', { name: 'Withdraw' }))
    expect(await screen.findByText('Enter an amount.')).toBeInTheDocument()
    expect(calls.filter((c) => c.init.method === 'POST')).toHaveLength(0)
  })

  it('ignores a double click: only one request is sent while one is in flight', async () => {
    const backend = fakeBackend()
    const { calls } = mockApi(backend.routes)
    const realDeposit = backend.routes['POST /api/wallet/deposit']
    let release!: () => void
    backend.routes['POST /api/wallet/deposit'] = (req) =>
      new Promise<Response>((resolve) => {
        release = () => resolve(realDeposit(req) as Response)
      })

    renderApp('/wallet')
    const user = userEvent.setup()
    await amount(user, '500')
    await user.dblClick(screen.getByRole('button', { name: 'Deposit' }))

    expect(screen.getByRole('button', { name: 'Deposit' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled()
    release()
    await screen.findByRole('status')
    expect(posts(calls, 'POST /api/wallet/deposit')).toHaveLength(1)
  })

  it('paginates the history', async () => {
    const many: WalletTx[] = Array.from({ length: 12 }, (_, i) => ({
      transactionId: `t${i}`, type: 'Deposit', direction: 'Credit', amount: 100 + i, referenceType: 'deposit', referenceId: null,
      createdAt: '2026-10-12T09:14:00+00:00',
    }))
    const { calls } = mockApi(fakeBackend(0, many).routes)
    renderApp('/wallet')
    const user = userEvent.setup()

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()

    const page2 = calls.filter((c) => c.key === 'GET /api/wallet/transactions').find((c) => c.url.searchParams.get('page') === '2')
    expect(page2?.url.searchParams.get('pageSize')).toBe('5')
  })

  it('shows an empty state', async () => {
    mockApi(fakeBackend(0, []).routes)
    renderApp('/wallet')
    expect(await screen.findByText('No transactions yet.')).toBeInTheDocument()
    expect(screen.getByText('ETB 0.00')).toBeInTheDocument()
  })

  it('offers a retry when the server cannot be reached, then recovers', async () => {
    const backend = fakeBackend()
    mockApi(backend.routes)
    const realBalance = backend.routes['GET /api/wallet']
    let down = true
    backend.routes['GET /api/wallet'] = (req) => {
      if (down) throw new TypeError('Failed to fetch')
      return realBalance(req)
    }

    renderApp('/wallet')
    const user = userEvent.setup()
    expect(await screen.findByText(/cannot reach the server/i)).toBeInTheDocument()

    down = false
    await user.click(screen.getAllByRole('button', { name: 'Retry' })[0])
    expect(await screen.findByText('ETB 1,250.00')).toBeInTheDocument()
  })

  it('signs the person out when the API says the token is no longer valid', async () => {
    const backend = fakeBackend()
    mockApi(backend.routes)
    backend.routes['GET /api/wallet'] = () => new Response(null, { status: 401 })

    renderApp('/wallet')
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })
})
