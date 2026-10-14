export type OddsCheck = { ok: true; odds: number } | { ok: false; error: string }

/** Mirrors the server: above 1.00, at most 1000.00, at most 4 decimals. */
export function validateOdds(input: string): OddsCheck {
  const text = input.trim()
  if (text === '') return { ok: false, error: 'Enter the odds.' }
  if (!/^\d{1,4}(?:\.\d+)?$/.test(text)) return { ok: false, error: 'Odds must be a number like 2.10.' }
  const fraction = text.split('.')[1] ?? ''
  if (fraction.length > 4) return { ok: false, error: 'Odds may have at most 4 decimals.' }
  const odds = Number(text)
  if (odds <= 1) return { ok: false, error: 'Odds must be above 1.00.' }
  if (odds > 1000) return { ok: false, error: 'Odds must be at most 1000.00.' }
  return { ok: true, odds }
}
