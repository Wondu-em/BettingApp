import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import { Button } from '../Button'
import { Card } from '../Card'
import { ErrorBanner } from '../ErrorBanner'
import { Field } from '../Field'
import { Notice } from '../Notice'
import { describeError } from '../../lib/errors'
import { validateEventForm, type FormErrors, type OutcomeRow } from '../../lib/eventForm'

const emptyRows = (): OutcomeRow[] => [
  { name: '', odds: '' },
  { name: '', odds: '' },
]

export function CreateEventForm() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [rows, setRows] = useState<OutcomeRow[]>(emptyRows)
  const [clientErrors, setClientErrors] = useState<FormErrors>({})
  const [notice, setNotice] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: (value: { title: string; outcomes: { name: string; odds: number }[] }) =>
      adminApi.createEvent(value.title, value.outcomes),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      setTitle('')
      setRows(emptyRows())
      setClientErrors({})
      setNotice(`Event created: ${created.title}`)
    },
  })

  const serverErrors = create.error ? describeError(create.error).fieldErrors : undefined
  const fieldError = (key: string) => clientErrors[key] ?? serverErrors?.[key]?.[0]

  function updateRow(index: number, patch: Partial<OutcomeRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    setClientErrors({})
    setNotice(null)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setNotice(null)
    create.reset()
    const check = validateEventForm(title, rows)
    if (!check.ok) {
      setClientErrors(check.errors)
      return
    }
    setClientErrors({})
    create.mutate(check.value)
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold text-ink">Create event</h2>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          label="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setClientErrors({})
            setNotice(null)
          }}
          error={fieldError('title')}
        />

        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_7rem] gap-3">
            <Field
              label={`Outcome ${i + 1}`}
              aria-label={`Outcome ${i + 1} name`}
              value={row.name}
              onChange={(e) => updateRow(i, { name: e.target.value })}
              error={fieldError(`outcomes[${i}].name`)}
            />
            <Field
              label="Odds"
              aria-label={`Odds ${i + 1}`}
              inputMode="decimal"
              placeholder="2.10"
              value={row.odds}
              onChange={(e) => updateRow(i, { odds: e.target.value })}
              error={fieldError(`outcomes[${i}].odds`)}
            />
          </div>
        ))}

        {fieldError('outcomes') && <p className="text-xs font-semibold text-bad-fg">{fieldError('outcomes')}</p>}

        {rows.length < 3 ? (
          <Button variant="secondary" fullWidth onClick={() => setRows((r) => [...r, { name: '', odds: '' }])}>
            Add third outcome
          </Button>
        ) : (
          <Button variant="secondary" fullWidth onClick={() => setRows((r) => r.slice(0, 2))}>
            Remove third outcome
          </Button>
        )}

        <Button type="submit" fullWidth disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create event'}
        </Button>

        <p className="text-sm text-muted">2 to 3 outcomes. Odds must be above 1.00.</p>
        {notice && <Notice>{notice}</Notice>}
        <ErrorBanner error={create.error} />
      </form>
    </Card>
  )
}
