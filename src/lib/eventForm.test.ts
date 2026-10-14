import { describe, expect, it } from 'vitest'
import { validateEventForm } from './eventForm'

const row = (name: string, odds: string) => ({ name, odds })

describe('validateEventForm', () => {
  it('accepts a valid two-outcome event and trims text', () => {
    expect(validateEventForm('  Event K vs Event L ', [row(' Home ', '2.20'), row('Away', '1.70')])).toEqual({
      ok: true,
      value: { title: 'Event K vs Event L', outcomes: [{ name: 'Home', odds: 2.2 }, { name: 'Away', odds: 1.7 }] },
    })
  })

  it('accepts three outcomes', () => {
    const check = validateEventForm('X', [row('A', '2'), row('B', '3'), row('C', '4')])
    expect(check.ok).toBe(true)
  })

  it('reports errors under the same keys the API uses', () => {
    const check = validateEventForm('', [row('', ''), row('Away', '1')])
    expect(check.ok).toBe(false)
    if (check.ok) return
    expect(Object.keys(check.errors).sort()).toEqual(['outcomes[0].name', 'outcomes[0].odds', 'outcomes[1].odds', 'title'])
    expect(check.errors['outcomes[1].odds']).toBe('Odds must be above 1.00.')
  })

  it('rejects duplicate names ignoring case', () => {
    const check = validateEventForm('X', [row('Home', '2'), row('home', '3')])
    expect(check.ok).toBe(false)
    if (!check.ok) expect(check.errors['outcomes[1].name']).toBe('Outcome names must be unique.')
  })

  it('requires 2 to 3 outcomes', () => {
    expect(validateEventForm('X', [row('A', '2')]).ok).toBe(false)
    const four = validateEventForm('X', [row('A', '2'), row('B', '2'), row('C', '2'), row('D', '2')])
    expect(four.ok).toBe(false)
    if (!four.ok) expect(four.errors.outcomes).toBe('An event needs 2 to 3 outcomes.')
  })

  it('limits the title length', () => {
    expect(validateEventForm('x'.repeat(201), [row('A', '2'), row('B', '3')]).ok).toBe(false)
    expect(validateEventForm('x'.repeat(200), [row('A', '2'), row('B', '3')]).ok).toBe(true)
  })
})
