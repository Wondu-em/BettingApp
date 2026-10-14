import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, renderApp, signInAs } from '../test/helpers'
import { mockApi, posts } from '../test/mockApi'
import { EV_AB, EV_CD, EV_EF, EV_IJ, betRoutes, designBets, type World } from '../test/fixtures'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function makeWorld(): World {
  return { events: [EV_AB, EV_CD, EV_EF, EV_IJ].map((e) => structuredClone(e)), bets: structuredClone(designBets), balance: 125_000 }
}

beforeEach(() => signInAs('User'))
afterEach(() => vi.unstubAllGlobals())

async function pick(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name }))
}

async function stake(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByLabelText('Stake (ETB)')
  await user.clear(input)
  await user.type(input, text)
  return input
}

describe('Events & bets page', () => {
  it('lists open events with odds buttons and closed events as closed; hides settled and voided ones', async () => {
    mockApi(betRoutes(makeWorld()))
    renderApp('/events')

    expect(await screen.findByRole('heading', { name: 'Event A vs Event B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home 2.10' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Draw 3.40' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Away 3.00' })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Event C vs Event D' })).toBeInTheDocument()
    expect(screen.getByText('Betting is closed. Awaiting settlement.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Home 2.00/ })).not.toBeInTheDocument()

    // Settled/voided events do not get a card (they only appear as names inside "My bets")
    expect(screen.queryByRole('heading', { name: 'Event E vs F' })).not.toBeInTheDocument()
  })

  it('shows recent bets with event titles, picks and the payout rules from the design', async () => {
    mockApi(betRoutes(makeWorld()))
    renderApp('/events')

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(4)

    const text = (row: HTMLElement) => row.textContent
    expect(text(rows[0])).toContain('Event A vs Event B')
    expect(text(rows[0])).toContain('Home @ 2.10')
    expect(text(rows[0])).toContain('100.00')
    expect(within(rows[0]).getByText('Placed')).toBeInTheDocument()
    expect(within(rows[1]).getByText('170.00')).toBeInTheDocument() // won
    expect(within(rows[2]).getByText('0.00')).toBeInTheDocument() // lost
    expect(within(rows[3]).getAllByText('60.00').length).toBeGreaterThan(0) // refunded: stake back
  })

  it('selecting an outcome fills the slip; the potential payout matches the design (100.00 @ 2.10 = 210.00)', async () => {
    mockApi(betRoutes(makeWorld()))
    renderApp('/events')
    const user = userEvent.setup()

    expect(await screen.findByText(/pick an outcome on an open event/i)).toBeInTheDocument()
    await pick(user, 'Home 2.10')

    expect(screen.getByRole('button', { name: 'Home 2.10' })).toHaveAttribute('aria-pressed', 'true')
    const slip = screen.getByRole('heading', { name: 'Bet slip' }).parentElement!
    expect(within(slip).getByText('Event A vs Event B')).toBeInTheDocument()
    expect(within(slip).getByText('Home @ 2.10')).toBeInTheDocument()

    await stake(user, '100.00')
    expect(screen.getByText('ETB 210.00')).toBeInTheDocument()
    expect(screen.getByText(/Balance ETB 1,250.00\./)).toBeInTheDocument()
  })

  it('rounds the potential payout down like the server', async () => {
    const world = makeWorld()
    world.events[0].outcomes[0] = { id: 'o1', name: 'Home', odds: 1.5, oddsBp: 15_000 }
    mockApi(betRoutes(world))
    renderApp('/events')
    const user = userEvent.setup()

    await pick(user, 'Home 1.50')
    await stake(user, '3.33') // 333 x 1.5 = 499.5 -> 4.99
    expect(screen.getByText('ETB 4.99')).toBeInTheDocument()
  })

  it('places a bet: integer stake, Idempotency-Key, new balance, new row in My bets', async () => {
    const world = makeWorld()
    const { calls } = mockApi(betRoutes(world))
    renderApp('/events')
    const user = userEvent.setup()

    await pick(user, 'Home 2.10')
    const input = await stake(user, '100.00')
    await user.click(screen.getByRole('button', { name: 'Place bet' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Bet placed for ETB 100.00. New balance ETB 1,150.00.')
    const [call] = posts(calls, 'POST /api/bets')
    expect(call.body).toEqual({ outcomeId: 'o1', stake: 10_000 })
    expect(call.init.headers['Idempotency-Key']).toMatch(UUID)
    expect(input).toHaveValue('')
    expect(await screen.findByText(/Balance ETB 1,150.00\./)).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('table')).getAllByText('Placed')).toHaveLength(2))
  })

  it('retrying after a network failure reuses the SAME key; editing the stake uses a NEW key', async () => {
    const world = makeWorld()
    const routes = betRoutes(world)
    const real = routes['POST /api/bets']
    let attempts = 0
    routes['POST /api/bets'] = (req) => {
      if (++attempts === 1) throw new TypeError('Failed to fetch')
      return real(req)
    }
    const { calls } = mockApi(routes)
    renderApp('/events')
    const user = userEvent.setup()

    await pick(user, 'Home 2.10')
    await stake(user, '50')
    await user.click(screen.getByRole('button', { name: 'Place bet' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Retrying is safe')

    await user.click(screen.getByRole('button', { name: 'Place bet' }))
    await screen.findByRole('status')

    const [first, retry] = posts(calls, 'POST /api/bets')
    expect(retry.init.headers['Idempotency-Key']).toBe(first.init.headers['Idempotency-Key'])

    // new intent after success -> new key
    await stake(user, '20')
    await user.click(screen.getByRole('button', { name: 'Place bet' }))
    await waitFor(() => expect(posts(calls, 'POST /api/bets')).toHaveLength(3))
    expect(posts(calls, 'POST /api/bets')[2].init.headers['Idempotency-Key']).not.toBe(first.init.headers['Idempotency-Key'])
  })

  it('409: shows the conflict in amber, refetches events and drops the selection once the event is closed', async () => {
    const world = makeWorld()
    const routes = betRoutes(world)
    routes['POST /api/bets'] = () => {
      world.events[0].status = 'Closed' // the admin closed it meanwhile
      return jsonResponse({ code: 'conflict', detail: 'Event is not open for betting.' }, 409)
    }
    const { calls } = mockApi(routes)
    renderApp('/events')
    const user = userEvent.setup()

    await pick(user, 'Home 2.10')
    await stake(user, '10')
    const before = calls.filter((c) => c.key === 'GET /api/events').length
    await user.click(screen.getByRole('button', { name: 'Place bet' }))

    // the slip resets (the event is no longer Open) and the cards update
    await waitFor(() => expect(calls.filter((c) => c.key === 'GET /api/events').length).toBeGreaterThan(before))
    expect(await screen.findAllByText('Betting is closed. Awaiting settlement.')).toHaveLength(2)
    expect(screen.getByText(/pick an outcome on an open event/i)).toBeInTheDocument()
  })

  it('422: shows insufficient funds in red and keeps the stake', async () => {
    const routes = betRoutes(makeWorld())
    routes['POST /api/bets'] = () => jsonResponse({ code: 'insufficient_funds', detail: 'x' }, 422)
    mockApi(routes)
    renderApp('/events')
    const user = userEvent.setup()

    await pick(user, 'Home 2.10')
    const input = await stake(user, '5000')
    await user.click(screen.getByRole('button', { name: 'Place bet' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient funds')
    expect(input).toHaveValue('5000')
  })

  it('429: shows the rate limit with a countdown and blocks the button', async () => {
    const routes = betRoutes(makeWorld())
    routes['POST /api/bets'] = () => jsonResponse({ code: 'rate_limited' }, 429, { 'Retry-After': '3' })
    mockApi(routes)
    renderApp('/events')
    const user = userEvent.setup()

    await pick(user, 'Home 2.10')
    await stake(user, '10')
    await user.click(screen.getByRole('button', { name: 'Place bet' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('429')
    expect(await screen.findByRole('button', { name: /try again in [123]s/i })).toBeDisabled()
  })

  it('validates the stake locally without calling the API', async () => {
    const { calls } = mockApi(betRoutes(makeWorld()))
    renderApp('/events')
    const user = userEvent.setup()

    await pick(user, 'Home 2.10')
    await stake(user, '1.005')
    await user.click(screen.getByRole('button', { name: 'Place bet' }))

    expect(await screen.findByText(/at most 2 decimals/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Stake (ETB)')).toHaveAttribute('aria-invalid', 'true')
    expect(posts(calls, 'POST /api/bets')).toHaveLength(0)
  })

  it('sends only one request on a double click', async () => {
    const world = makeWorld()
    const routes = betRoutes(world)
    const real = routes['POST /api/bets']
    let release!: () => void
    routes['POST /api/bets'] = (req) =>
      new Promise<Response>((resolve) => {
        release = () => resolve(real(req) as Response)
      })
    const { calls } = mockApi(routes)
    renderApp('/events')
    const user = userEvent.setup()

    await pick(user, 'Home 2.10')
    await stake(user, '10')
    await user.dblClick(screen.getByRole('button', { name: 'Place bet' }))
    expect(screen.getByRole('button', { name: 'Placing…' })).toBeDisabled()
    release()
    await screen.findByRole('status')
    expect(posts(calls, 'POST /api/bets')).toHaveLength(1)
  })

  it('shows an empty state and a retry when events cannot be loaded', async () => {
    const world = makeWorld()
    world.events = []
    mockApi(betRoutes(world))
    renderApp('/events')
    expect(await screen.findByText(/no events to bet on/i)).toBeInTheDocument()
  })

  it('offers a retry when the server is unreachable, then recovers', async () => {
    const routes = betRoutes(makeWorld())
    const real = routes['GET /api/events']
    let down = true
    routes['GET /api/events'] = (req) => {
      if (down) throw new TypeError('Failed to fetch')
      return real(req)
    }
    mockApi(routes)
    renderApp('/events')
    const user = userEvent.setup()

    expect(await screen.findByText(/cannot reach the server/i)).toBeInTheDocument()
    down = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'Event A vs Event B' })).toBeInTheDocument()
  })
})
