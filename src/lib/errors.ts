import { ApiError } from '../api/client'

export type Tone = 'bad' | 'warn'

export interface ErrorView {
  message: string
  tone: Tone
  /** Per-field messages from a 400 (keys are the API's field names, e.g. "email", "outcomes[0].odds"). */
  fieldErrors?: Record<string, string[]>
}

/** Turns anything thrown by the API client into the message and colour the UI shows. */
export function describeError(error: unknown): ErrorView {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'insufficient_funds':
        return { tone: 'bad', message: 'Insufficient funds: the amount exceeds your balance (422)' }
      case 'validation_failed':
        return { tone: 'bad', message: 'Please check the highlighted fields (400)', fieldErrors: error.fieldErrors }
      case 'invalid_credentials':
        return { tone: 'bad', message: 'Invalid email or password' }
      case 'idempotency_key_reuse':
        return { tone: 'bad', message: 'That request was already used with different details. Please try again (422)' }
      case 'conflict':
        return { tone: 'warn', message: `${error.message} (409)` }
      case 'rate_limited':
        return {
          tone: 'warn',
          message: error.retryAfter
            ? `Too many requests. Try again in ${error.retryAfter} s (429)`
            : 'Too many requests. Please slow down (429)',
        }
      case 'unauthorized':
        return { tone: 'bad', message: 'Your session has expired. Please sign in again (401)' }
      case 'forbidden':
        return { tone: 'bad', message: "You don't have permission to do that (403)" }
      case 'not_found':
        return { tone: 'bad', message: `${error.message} (404)` }
    }
    if (error.status >= 500) return { tone: 'bad', message: 'Something went wrong on our side. Please try again (500)' }
    return { tone: 'bad', message: `${error.message} (${error.status})` }
  }

  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) {
    return { tone: 'warn', message: 'Cannot reach the server. Check your connection and try again. Retrying is safe.' }
  }

  return { tone: 'bad', message: error instanceof Error ? error.message : 'Something went wrong.' }
}
