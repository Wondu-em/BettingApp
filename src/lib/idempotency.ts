import { useRef } from 'react'

/** A random v4 UUID. Falls back when crypto.randomUUID is unavailable (plain-http pages on a LAN address). */
export function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * One key per user INTENT, not per click:
 *  - retrying the same attempt (timeout, double click)  -> same key, so the server can deduplicate;
 *  - the intent changed (new amount) or finished (success) -> call rotate() for a fresh key.
 */
export function useIdempotencyKey() {
  const ref = useRef<string | null>(null)
  return {
    current(): string {
      if (ref.current === null) ref.current = newKey()
      return ref.current
    },
    rotate(): void {
      ref.current = newKey()
    },
  }
}
