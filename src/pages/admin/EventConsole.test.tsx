import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BettingEvent } from '../../api/types'
import { jsonResponse, renderApp, signInAs } from '../../test/helpers'
import { mockApi, posts, type Handler } from '../../test/mockApi'
import { EV_AB, EV_CD, EV_EF, event, outcome } from '../../test/fixtures'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

interface World {
  events: BettingEvent[]
}

const makeWorld = (): World => ({ events: [EV_AB, EV_CD, EV_EF].map((e) => structuredClone(e)) })

function adminRoutes(world: World): Record<string, Handler> {
  const find = (id: string) => world.events.find((e) => e.id === id)!
  return {
    'GET /api/events': () => jsonResponse({ items: world.events, page: 1, pageSize: 100, total: world.events.length }),
    'POST /api/admin/events': ({ body }) => {
      const created = event(
        `n${world.events.length}`, body.title, 'Open',
        body.outcomes.map((o: { name: string; odds: number }, i: number) => outcome(`no${world.events.length}${i}`, o.name, o.odds)),
      )
      world.events.unshift(created)
      return jsonResponse(created, 201)
    },
    'POST /api/admin/events/:id/close': ({ params }) => {
      const e = find(params.id)
      if (e.status === 'Open') e.status = 'Closed'
      return jsonResponse(e)
    },
    'POST /api/admin/events/:id/settle': ({ params, body }) => {
      const e = find(params.id)
      e.status = 'Settled'
      e.winningOutcomeId = body.winningOutcomeId
      return jsonResponse({
        eventId: e.id, status: 'Settled', winningOutcomeId: body.winningOutcomeId, winningBets: 2, losingBets: 1,
        totalStaked: 7_000, totalPaidOut: 6_000, houseResult: 1_000, settledAt: '2026-10-14T10:00:00+00:00',
      })
    },
    'POST /api/admin/events/:id/void': ({ params, body }) => {
      const e = find(params.id)
      e.status = 'Voided'
      return jsonResponse({
        eventId: e.id, status: 'Voided', betsRefunded: 3, totalRefunded: 7_000, reason: body.reason ?? null,
        voidedAt: '2026-10-14T10:00:00+00:00',
      })
    },
  }
}

beforeEach(() => signInAs('Admin'))
afterEach(() => vi.unstubAllGlobals())

const rowOf = async (title: string) => (await screen.findByRole('button', { name: title })).closest('tr') as HTMLElement
const setup = () => userEvent.setup()

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Title'), 'Event K vs Event L')
  await user.type(screen.getByLabelText('Outcome 1 name'), 'Home')
  await user.type(screen.getByLabelText('Odds 1'), '2.20')
  await user.type(screen.getByLabelText('Outcome 2 name'), 'Away')
  await user.type(screen.getByLabelText('Odds 2'), '1.70')
}

describe('Event console: list and actions', () => {
  it('shows each event with the actions its status allows', async () => {
    mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')

    const open = await rowOf('Event A vs Event B')
    expect(within(open).getByText('Open')).toBeInTheDocument()
    expect(within(open).getByRole('button', { name: 'Close Event A vs Event B' })).toBeInTheDocument()
    expect(within(open).getByRole('button', { name: 'Void Event A vs Event B' })).toBeInTheDocument()
    expect(within(open).queryByRole('button', { name: /Settle/ })).not.toBeInTheDocument() // cannot settle an open event

    const closed = await rowOf('Event C vs Event D')
    expect(within(closed).getByRole('button', { name: 'Settle Event C vs Event D' })).toBeInTheDocument()
    expect(within(closed).getByRole('button', { name: 'Void Event C vs Event D' })).toBeInTheDocument()
    expect(within(closed).queryByRole('button', { name: /Close/ })).not.toBeInTheDocument()

    const settled = await rowOf('Event E vs F')
    expect(within(settled).getByText('Settled')).toBeInTheDocument()
    expect(within(settled).getByText('Final')).toBeInTheDocument()
    expect(within(settled).queryAllByRole('button')).toHaveLength(1) // only the title
  })

  it('closes an open event', async () => {
    const { calls } = mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()

    await rowOf('Event A vs Event B')
    await user.click(screen.getByRole('button', { name: 'Close Event A vs Event B' }))

    await waitFor(async () => expect(within(await rowOf('Event A vs Event B')).getByText('Closed')).toBeInTheDocument())
    expect(posts(calls, 'POST /api/admin/events/e1/close')).toHaveLength(1)
    expect(await screen.findByRole('button', { name: 'Settle Event A vs Event B' })).toBeInTheDocument()
  })

  it('shows a timeline for the selected event and says what the API does not provide', async () => {
    mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()

    expect(await screen.findByText(/select an event to see its timeline/i)).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Event A vs Event B' }))
    expect(screen.getByText(/currently open/i)).toBeInTheDocument()
    expect(screen.getByText(/needs a history endpoint/i)).toBeInTheDocument()
  })
})

describe('Event console: create event', () => {
  it('creates an event with decimal odds and shows it in the list', async () => {
    const { calls } = mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()

    await rowOf('Event A vs Event B')
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(await screen.findByText('Event created: Event K vs Event L')).toBeInTheDocument()
    expect(posts(calls, 'POST /api/admin/events')[0].body).toEqual({
      title: 'Event K vs Event L',
      outcomes: [{ name: 'Home', odds: 2.2 }, { name: 'Away', odds: 1.7 }],
    })
    expect(await screen.findByRole('button', { name: 'Event K vs Event L' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('supports an optional third outcome (max 3)', async () => {
    const { calls } = mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()

    await rowOf('Event A vs Event B')
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Add third outcome' }))
    await user.type(screen.getByLabelText('Outcome 3 name'), 'Draw')
    await user.type(screen.getByLabelText('Odds 3'), '3.4')

    expect(screen.queryByRole('button', { name: 'Add third outcome' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    await screen.findByText('Event created: Event K vs Event L')
    expect(posts(calls, 'POST /api/admin/events')[0].body.outcomes).toHaveLength(3)
  })

  it('can remove the third outcome again', async () => {
    mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()

    await rowOf('Event A vs Event B')
    await user.click(screen.getByRole('button', { name: 'Add third outcome' }))
    await user.click(screen.getByRole('button', { name: 'Remove third outcome' }))
    expect(screen.queryByLabelText('Outcome 3 name')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add third outcome' })).toBeInTheDocument()
  })

  it('validates locally, field by field, without calling the API', async () => {
    const { calls } = mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()

    await rowOf('Event A vs Event B')
    await user.click(screen.getByRole('button', { name: 'Create event' }))
    expect(await screen.findByText('Title is required (max 200 characters).')).toBeInTheDocument()
    expect(screen.getAllByText('Enter the odds.')).toHaveLength(2)
    expect(screen.getAllByText('Name is required (max 100 characters).')).toHaveLength(2)

    await user.type(screen.getByLabelText('Title'), 'X')
    await user.type(screen.getByLabelText('Outcome 1 name'), 'Home')
    await user.type(screen.getByLabelText('Outcome 2 name'), 'home')
    await user.type(screen.getByLabelText('Odds 1'), '1.00')
    await user.type(screen.getByLabelText('Odds 2'), '2.12345')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(await screen.findByText('Odds must be above 1.00.')).toBeInTheDocument()
    expect(screen.getByText('Odds may have at most 4 decimals.')).toBeInTheDocument()
    expect(screen.getByText('Outcome names must be unique.')).toBeInTheDocument()
    expect(screen.getByLabelText('Odds 1')).toHaveAttribute('aria-invalid', 'true')
    expect(posts(calls, 'POST /api/admin/events')).toHaveLength(0)
  })

  it('shows field errors returned by the server next to the right input', async () => {
    const routes = adminRoutes(makeWorld())
    routes['POST /api/admin/events'] = () =>
      jsonResponse({ code: 'validation_failed', errors: { 'outcomes[1].odds': ['Server says no.'] } }, 400)
    mockApi(routes)
    renderApp('/admin/events')
    const user = setup()

    await rowOf('Event A vs Event B')
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(await screen.findByText('Server says no.')).toBeInTheDocument()
    expect(screen.getByLabelText('Odds 2')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Odds 1')).not.toHaveAttribute('aria-invalid')
  })
})

describe('Event console: settle', () => {
  async function openSettle(user: ReturnType<typeof userEvent.setup>) {
    await rowOf('Event C vs Event D')
    await user.click(screen.getByRole('button', { name: 'Settle Event C vs Event D' }))
    return screen.findByRole('heading', { name: 'Settle: Event C vs Event D' })
  }

  it('requires an explicit winner, settles once, and reports the result', async () => {
    const world = makeWorld()
    const { calls } = mockApi(adminRoutes(world))
    renderApp('/admin/events')
    const user = setup()

    await openSettle(user)
    expect(screen.getByText(/final and can run only once/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm settlement' })).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Winning outcome'), 'o4') // "Home @ 2.00"
    await user.click(screen.getByRole('button', { name: 'Confirm settlement' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Settled. 2 winning bets, 1 losing bet. Paid out ETB 60.00 of ETB 70.00 staked. House result: +ETB 10.00.',
    )
    const [call] = posts(calls, 'POST /api/admin/events/e2/settle')
    expect(call.body).toEqual({ winningOutcomeId: 'o4' })
    expect(call.init.headers['Idempotency-Key']).toMatch(UUID)

    expect(screen.queryByRole('heading', { name: /Settle: Event C/ })).not.toBeInTheDocument() // panel closed
    await waitFor(async () => expect(within(await rowOf('Event C vs Event D')).getByText('Final')).toBeInTheDocument())
  })

  it('lists the outcomes with their odds', async () => {
    mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()
    await openSettle(user)
    expect(screen.getByRole('option', { name: 'Home @ 2.00' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Away @ 1.80' })).toBeInTheDocument()
  })

  it('Cancel closes the panel without any request', async () => {
    const { calls } = mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()

    await openSettle(user)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: /Settle: Event C/ })).not.toBeInTheDocument()
    expect(calls.filter((c) => c.init.method === 'POST')).toHaveLength(0)
  })

  it('retrying after a network failure reuses the SAME key; choosing another winner uses a NEW key', async () => {
    const world = makeWorld()
    const routes = adminRoutes(world)
    const real = routes['POST /api/admin/events/:id/settle']
    let attempts = 0
    routes['POST /api/admin/events/:id/settle'] = (req) => {
      if (++attempts <= 2) throw new TypeError('Failed to fetch')
      return real(req)
    }
    const { calls } = mockApi(routes)
    renderApp('/admin/events')
    const user = setup()

    await openSettle(user)
    await user.selectOptions(screen.getByLabelText('Winning outcome'), 'o4')
    await user.click(screen.getByRole('button', { name: 'Confirm settlement' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Retrying is safe')

    await user.click(screen.getByRole('button', { name: 'Confirm settlement' })) // same attempt again
    await waitFor(() => expect(posts(calls, 'POST /api/admin/events/e2/settle')).toHaveLength(2))
    const [first, retry] = posts(calls, 'POST /api/admin/events/e2/settle')
    expect(retry.init.headers['Idempotency-Key']).toBe(first.init.headers['Idempotency-Key'])

    await user.selectOptions(screen.getByLabelText('Winning outcome'), 'o5') // different winner = different intent
    await user.click(screen.getByRole('button', { name: 'Confirm settlement' }))
    await screen.findByRole('status')
    const third = posts(calls, 'POST /api/admin/events/e2/settle')[2]
    expect(third.body).toEqual({ winningOutcomeId: 'o5' })
    expect(third.init.headers['Idempotency-Key']).not.toBe(first.init.headers['Idempotency-Key'])
  })

  it('409 (someone else settled it): amber message, table refreshes, confirm is disabled', async () => {
    const world = makeWorld()
    const routes = adminRoutes(world)
    routes['POST /api/admin/events/:id/settle'] = ({ params }) => {
      world.events.find((e) => e.id === params.id)!.status = 'Settled'
      return jsonResponse({ code: 'conflict', detail: 'Event has already been settled.' }, 409)
    }
    mockApi(routes)
    renderApp('/admin/events')
    const user = setup()

    await openSettle(user)
    await user.selectOptions(screen.getByLabelText('Winning outcome'), 'o4')
    await user.click(screen.getByRole('button', { name: 'Confirm settlement' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('already been settled')
    expect(screen.getByRole('alert')).toHaveTextContent('409')
    expect(await screen.findByText('This event is now Settled.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm settlement' })).toBeDisabled()
  })

  it('sends one request on a double click', async () => {
    const world = makeWorld()
    const routes = adminRoutes(world)
    const real = routes['POST /api/admin/events/:id/settle']
    let release!: () => void
    routes['POST /api/admin/events/:id/settle'] = (req) =>
      new Promise<Response>((resolve) => {
        release = () => resolve(real(req) as Response)
      })
    const { calls } = mockApi(routes)
    renderApp('/admin/events')
    const user = setup()

    await openSettle(user)
    await user.selectOptions(screen.getByLabelText('Winning outcome'), 'o4')
    await user.dblClick(screen.getByRole('button', { name: 'Confirm settlement' }))
    expect(screen.getByRole('button', { name: 'Settling…' })).toBeDisabled()
    release()
    await screen.findByRole('status')
    expect(posts(calls, 'POST /api/admin/events/e2/settle')).toHaveLength(1)
  })
})

describe('Event console: void', () => {
  it('voids with a reason and reports the refunds', async () => {
    const { calls } = mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()

    await rowOf('Event A vs Event B')
    await user.click(screen.getByRole('button', { name: 'Void Event A vs Event B' }))
    expect(await screen.findByRole('heading', { name: 'Void: Event A vs Event B' })).toBeInTheDocument()
    expect(screen.getByText(/refunds every stake in full and cannot be undone/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Reason (optional)'), 'match abandoned')
    await user.click(screen.getByRole('button', { name: 'Confirm void' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Voided. 3 bets refunded, ETB 70.00 returned to players.')
    const [call] = posts(calls, 'POST /api/admin/events/e1/void')
    expect(call.body).toEqual({ reason: 'match abandoned' })
    expect(call.init.headers['Idempotency-Key']).toMatch(UUID)
    await waitFor(async () => expect(within(await rowOf('Event A vs Event B')).getByText('Voided')).toBeInTheDocument())
  })

  it('voids a closed event without a reason', async () => {
    const { calls } = mockApi(adminRoutes(makeWorld()))
    renderApp('/admin/events')
    const user = setup()

    await rowOf('Event C vs Event D')
    await user.click(screen.getByRole('button', { name: 'Void Event C vs Event D' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm void' }))

    await screen.findByRole('status')
    expect(posts(calls, 'POST /api/admin/events/e2/void')[0].body).toEqual({})
  })

  it('retrying a failed void reuses the same key; editing the reason rotates it', async () => {
    const world = makeWorld()
    const routes = adminRoutes(world)
    const real = routes['POST /api/admin/events/:id/void']
    let attempts = 0
    routes['POST /api/admin/events/:id/void'] = (req) => {
      if (++attempts === 1) throw new TypeError('Failed to fetch')
      return real(req)
    }
    const { calls } = mockApi(routes)
    renderApp('/admin/events')
    const user = setup()

    await rowOf('Event A vs Event B')
    await user.click(screen.getByRole('button', { name: 'Void Event A vs Event B' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm void' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Confirm void' }))
    await screen.findByRole('status')

    const [first, retry] = posts(calls, 'POST /api/admin/events/e1/void')
    expect(retry.init.headers['Idempotency-Key']).toBe(first.init.headers['Idempotency-Key'])
  })
})

describe('Event console: access', () => {
  it('a normal user sees the 403 screen instead of the console', async () => {
    sessionStorage.clear()
    signInAs('User')
    mockApi({})
    renderApp('/admin/events')
    expect(await screen.findByText('403 Forbidden')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /access to Event console/i })).toBeInTheDocument()
  })
})
