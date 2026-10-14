import { api } from './client'
import type { Bet, BetStatus, Paged, PlacedBet } from './types'

export interface BetFilter {
  status?: BetStatus
  eventId?: string
  page: number
  pageSize: number
}

export const betsApi = {
  place: (outcomeId: string, stake: number, idempotencyKey: string) =>
    api<PlacedBet>('/bets', { method: 'POST', body: { outcomeId, stake }, idempotencyKey }),

  list: ({ status, eventId, page, pageSize }: BetFilter) => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (status) query.set('status', status)
    if (eventId) query.set('eventId', eventId)
    return api<Paged<Bet>>(`/bets?${query.toString()}`)
  },
}
