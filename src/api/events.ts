import { api } from './client'
import type { BettingEvent, EventStatus, Paged } from './types'

export const eventsApi = {
  list: (page = 1, pageSize = 100, status?: EventStatus) =>
    api<Paged<BettingEvent>>(`/events?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ''}`),
}
