import { validateOdds } from './odds'

export interface OutcomeRow {
  name: string
  odds: string
}

/** Keys match the API's field names ("title", "outcomes", "outcomes[0].name", "outcomes[0].odds"). */
export type FormErrors = Record<string, string>

export type EventFormCheck =
  | { ok: true; value: { title: string; outcomes: { name: string; odds: number }[] } }
  | { ok: false; errors: FormErrors }

export function validateEventForm(titleInput: string, rows: OutcomeRow[]): EventFormCheck {
  const errors: FormErrors = {}
  const title = titleInput.trim()

  if (title.length === 0 || title.length > 200) errors.title = 'Title is required (max 200 characters).'
  if (rows.length < 2 || rows.length > 3) errors.outcomes = 'An event needs 2 to 3 outcomes.'

  const seen = new Set<string>()
  const outcomes: { name: string; odds: number }[] = []

  rows.forEach((row, i) => {
    const name = row.name.trim()
    if (name.length === 0 || name.length > 100) errors[`outcomes[${i}].name`] = 'Name is required (max 100 characters).'
    else if (seen.has(name.toLowerCase())) errors[`outcomes[${i}].name`] = 'Outcome names must be unique.'
    else seen.add(name.toLowerCase())

    const odds = validateOdds(row.odds)
    if (!odds.ok) errors[`outcomes[${i}].odds`] = odds.error
    else outcomes.push({ name, odds: odds.odds })
  })

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: { title, outcomes } }
}
