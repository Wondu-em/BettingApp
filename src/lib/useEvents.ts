import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '../api/events'
import type { Bet, BettingEvent } from '../api/types'

export const EVENTS_KEY = ['events'] as const

/** All events (up to 100). Shared by the events page and every bets table. */
export function useEvents() {
  return useQuery({ queryKey: EVENTS_KEY, queryFn: () => eventsApi.list(1, 100) })
}

/**
 * The API's bet only carries ids, so titles and pick names are looked up from the events list.
 * Falls back to a short id when an event is not in the loaded list.
 */
export function useBetDescriber(events: BettingEvent[] | undefined) {
  return useMemo(() => {
    const byId = new Map((events ?? []).map((e) => [e.id, e]))
    return (bet: Bet) => {
      const event = byId.get(bet.eventId)
      const outcome = event?.outcomes.find((o) => o.id === bet.outcomeId)
      return {
        title: event?.title ?? `Event ${bet.eventId.slice(0, 4)}…`,
        pick: `${outcome?.name ?? 'Pick'} @ ${bet.odds.toFixed(2)}`,
      }
    }
  }, [events])
}
