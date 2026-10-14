import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, signInAs } from '../test/helpers'
import { mockApi } from '../test/mockApi'
import { EV_AB, EV_CD, EV_EF, EV_GH, EV_IJ, bet, betRoutes, designBets, type World } from '../test/fixtures'

function world(bets = designBets): World {
  return { events: [EV_AB, EV_CD, EV_EF, EV_GH, EV_IJ], bets: structuredClone(bets), balance: 0 }
}

beforeEach(() => signInAs('User'))
afterEach(() => vi.unstubAllGlobals())

describe('My bets page', () => {
  it('lists all bets with event, pick, stake, status and payout', async () => {
    mockApi(betRoutes(world()))
    renderApp('/bets')

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(4)

    expect(rows[0].textContent).toContain('Event A vs Event B')
    expect(rows[0].textContent).toContain('Home @ 2.10')
    expect(within(rows[0]).getByText('Placed')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Won')).toBeInTheDocument()
    expect(within(rows[1]).getByText('170.00')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Lost')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Refunded')).toBeInTheDocument()
    expect(screen.getByText('4 bets')).toBeInTheDocument()
  })

  it('filters by status through the API', async () => {
    const { calls } = mockApi(betRoutes(world()))
    renderApp('/bets')
    const user = userEvent.setup()

    await screen.findByRole('table')
    await user.selectOptions(screen.getByLabelText('Status'), 'Won')

    expect(await screen.findByText('1 bets')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
    const filtered = calls.filter((c) => c.key === 'GET /api/bets').at(-1)!
    expect(filtered.url.searchParams.get('status')).toBe('Won')
    expect(filtered.url.searchParams.get('page')).toBe('1')
  })

  it('says so when a filter has no results', async () => {
    mockApi(betRoutes(world([bet('b', EV_AB, EV_AB.outcomes[0], 100, 'Placed', null)])))
    renderApp('/bets')
    const user = userEvent.setup()

    await screen.findByRole('table')
    await user.selectOptions(screen.getByLabelText('Status'), 'Lost')
    expect(await screen.findByText('No lost bets.')).toBeInTheDocument()
  })

  it('shows an empty state when there are no bets at all', async () => {
    mockApi(betRoutes(world([])))
    renderApp('/bets')
    expect(await screen.findByText('You have not placed any bets yet.')).toBeInTheDocument()
  })

  it('falls back to a short id when the event is not in the loaded list', async () => {
    const orphan = bet('b9', { ...EV_AB, id: '7f3a0000-0000-0000-0000-000000000000' }, EV_AB.outcomes[0], 1_000, 'Placed', null)
    mockApi(betRoutes(world([orphan])))
    renderApp('/bets')
    expect(await screen.findByText('Event 7f3a…')).toBeInTheDocument()
  })

  it('paginates', async () => {
    const many = Array.from({ length: 23 }, (_, i) => bet(`b${i}`, EV_AB, EV_AB.outcomes[0], 100 + i, 'Placed', null))
    const { calls } = mockApi(betRoutes(world(many)))
    renderApp('/bets')
    const user = userEvent.setup()

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
    expect(calls.filter((c) => c.key === 'GET /api/bets').some((c) => c.url.searchParams.get('page') === '2')).toBe(true)
  })
})
