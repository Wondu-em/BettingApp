/**
 * The API speaks integer minor units (santim): 100 = 1.00 ETB.
 * Money is never converted through floating point on the way in or out.
 */

/** Largest single deposit / withdrawal / stake the server accepts (1,000,000.00 ETB). */
export const MAX_SINGLE_AMOUNT = 100_000_000

/** 125000 -> "1,250.00" */
export function formatAmount(minor: number): string {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(Math.trunc(minor))
  const whole = Math.floor(abs / 100)
  const fraction = String(abs % 100).padStart(2, '0')
  return `${sign}${whole.toLocaleString('en-US')}.${fraction}`
}

/** 125000 -> "ETB 1,250.00" */
export function formatEtb(minor: number): string {
  return `ETB ${formatAmount(minor)}`
}

/** Wallet history: money in is "+500.00", money out is "-100.00". */
export function formatSigned(minor: number, direction: 'Credit' | 'Debit'): string {
  return `${direction === 'Credit' ? '+' : '-'}${formatAmount(Math.abs(minor))}`
}

/**
 * Parses what a person types ("12", "12.5", "1,250.00") into minor units.
 * Returns null for anything ambiguous: more than 2 decimals, negatives, exponents, text.
 */
export function parseEtb(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, '')
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(cleaned)
  if (!match) return null
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
}

export type AmountCheck = { ok: true; minor: number } | { ok: false; error: string }

/** Validates an amount field the same way the server does (positive, within the single-amount cap). */
export function validateAmount(input: string): AmountCheck {
  if (input.trim() === '') return { ok: false, error: 'Enter an amount.' }
  const minor = parseEtb(input)
  if (minor === null) return { ok: false, error: 'Use a number with at most 2 decimals, e.g. 500.00.' }
  if (minor <= 0) return { ok: false, error: 'Amount must be greater than zero.' }
  if (minor > MAX_SINGLE_AMOUNT) return { ok: false, error: 'Amount is above the allowed maximum.' }
  return { ok: true, minor }
}
