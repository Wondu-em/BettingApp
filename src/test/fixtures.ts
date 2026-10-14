import type { Bet, BettingEvent, EventStatus, Outcome } from '../api/types'
import { jsonResponse } from './helpers'
import type { Handler } from './mockApi'

export const outcome = (id: string, name: string, odds: number): Outcome => ({
  id,
  name,
  odds,
  oddsBp: Math.round(odds * 10_000),
})

export const event = (id: string, title: string, status: EventStatus, outcomes: Outcome[]): BettingEvent => ({
  id,
  title,
  status,
  winningOutcomeId: null,
  createdAt: '2026-10-10T08:00:00+00:00',
  settledAt: null,
  outcomes,
})

export const bet = (id: string, e: BettingEvent, o: Outcome, stake: number, status: Bet['status'], payout: number | null): Bet => ({
  id,
  eventId: e.id,
  outcomeId: o.id,
  stake,
  oddsBp: o.oddsBp,
  odds: o.odds,
  status,
  payout,
  potentialPayout: Math.floor((stake * o.oddsBp) / 10_000),
  placedAt: '2026-10-12T09:31:00+00:00',
  settledAt: null,
})

// The events from the design
export const EV_AB = event('e1', 'Event A vs Event B', 'Open', [outcome('o1', 'Home', 2.1), outcome('o2', 'Draw', 3.4), outcome('o3', 'Away', 3.0)])
export const EV_CD = event('e2', 'Event C vs Event D', 'Closed', [outcome('o4', 'Home', 2.0), outcome('o5', 'Away', 1.8)])
export const EV_EF = event('e3', 'Event E vs F', 'Settled', [outcome('o6', 'Draw', 3.4), outcome('o7', 'Home', 2.0)])
export const EV_GH = event('e4', 'Event G vs H', 'Settled', [outcome('o8', 'Away', 2.0), outcome('o9', 'Home', 1.5)])
export const EV_IJ = event('e5', 'Event I vs J', 'Voided', [outcome('o10', 'Home', 1.8), outcome('o11', 'Away', 2.0)])

export const designBets: Bet[] = [
  bet('b1', EV_AB, EV_AB.outcomes[0], 10_000, 'Placed', null),
  bet('b2', EV_EF, EV_EF.outcomes[0], 5_000, 'Won', 17_000),
  bet('b3', EV_GH, EV_GH.outcomes[0], 8_000, 'Lost', 0),
  bet('b4', EV_IJ, EV_IJ.outcomes[0], 6_000, 'Refunded', null),
]

export interface World {
  events: BettingEvent[]
  bets: Bet[]
  balance: number
}

/** Fake backend for the wallet, events and bets endpoints. Mutate `world` to change what it returns. */
export function betRoutes(world: World): Record<string, Handler> {
  return {
    'GET /api/wallet': () => jsonResponse({ walletId: 'w1', balance: world.balance, currency: 'ETB' }),
    'GET /api/wallet/transactions': () => jsonResponse({ items: [], page: 1, pageSize: 5, total: 0 }),
    'GET /api/events': () =>
      jsonResponse({ items: world.events, page: 1, pageSize: 100, total: world.events.length }),
    'GET /api/bets': ({ url }) => {
      const status = url.searchParams.get('status')
      const page = Number(url.searchParams.get('page'))
      const size = Number(url.searchParams.get('pageSize'))
      const all = world.bets.filter((b) => !status || b.status === status)
      return jsonResponse({ items: all.slice((page - 1) * size, page * size), page, pageSize: size, total: all.length })
    },
    'POST /api/bets': ({ body }) => {
      const ev = world.events.find((e) => e.outcomes.some((o) => o.id === body.outcomeId))!
      const out = ev.outcomes.find((o) => o.id === body.outcomeId)!
      world.balance -= body.stake
      const placed = bet(`new${world.bets.length}`, ev, out, body.stake, 'Placed', null)
      world.bets.unshift(placed)
      return jsonResponse({ bet: placed, balance: world.balance }, 201)
    },
  }
}
