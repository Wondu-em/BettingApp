import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import type { BettingEvent } from '../../api/types'
import { CreateEventForm } from '../../components/admin/CreateEventForm'
import { EventTimeline } from '../../components/admin/EventTimeline'
import { EventsTable } from '../../components/admin/EventsTable'
import { SettlePanel } from '../../components/admin/SettlePanel'
import { VoidPanel } from '../../components/admin/VoidPanel'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { useEvents } from '../../lib/useEvents'
import { settlementSummary, voidSummary } from '../../lib/text'

type Panel = { kind: 'settle' | 'void'; eventId: string }

export function EventConsole() {
  const queryClient = useQueryClient()
  const events = useEvents()
  const [panel, setPanel] = useState<Panel | null>(null)
  const [result, setResult] = useState<{ title: string; summary: string } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const close = useMutation({
    mutationFn: (event: BettingEvent) => adminApi.closeEvent(event.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['events'] }),
    onError: () => void queryClient.invalidateQueries({ queryKey: ['events'] }),
  })

  const list = events.data?.items ?? []
  const panelEvent = panel ? list.find((e) => e.id === panel.eventId) : undefined
  const selected = list.find((e) => e.id === selectedId) ?? null

  function open(kind: Panel['kind'], event: BettingEvent) {
    setResult(null)
    close.reset()
    setSelectedId(event.id)
    setPanel({ kind, eventId: event.id })
  }

  return (
    <>
      <PageHeader title="Event console" />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <CreateEventForm />

        <div className="space-y-5">
          {events.isLoading && (
            <Card>
              <p className="text-sm text-muted">Loading events…</p>
            </Card>
          )}
          {events.isError && (
            <Card className="space-y-3">
              <ErrorBanner error={events.error} />
              <Button variant="secondary" onClick={() => void events.refetch()}>
                Retry
              </Button>
            </Card>
          )}

          {events.data && (
            <EventsTable
              events={list}
              selectedId={selectedId}
              closingId={close.isPending ? (close.variables?.id ?? null) : null}
              onSelect={setSelectedId}
              onClose={(e) => {
                setResult(null)
                close.mutate(e)
              }}
              onSettle={(e) => open('settle', e)}
              onVoid={(e) => open('void', e)}
            />
          )}

          <ErrorBanner error={close.error} />

          {panel?.kind === 'settle' && panelEvent && (
            <SettlePanel
              key={panelEvent.id}
              event={panelEvent}
              onCancel={() => setPanel(null)}
              onDone={(r) => {
                setResult({ title: `Settled: ${panelEvent.title}`, summary: settlementSummary(r) })
                setPanel(null)
              }}
            />
          )}

          {panel?.kind === 'void' && panelEvent && (
            <VoidPanel
              key={panelEvent.id}
              event={panelEvent}
              onCancel={() => setPanel(null)}
              onDone={(r) => {
                setResult({ title: `Voided: ${panelEvent.title}`, summary: voidSummary(r) })
                setPanel(null)
              }}
            />
          )}

          {result && (
            <Card className="space-y-2">
              <h2 className="text-lg font-bold text-ink">{result.title}</h2>
              <Notice>{result.summary}</Notice>
              <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => setResult(null)}>
                Dismiss
              </Button>
            </Card>
          )}

          <EventTimeline event={selected} />
        </div>
      </div>
    </>
  )
}
