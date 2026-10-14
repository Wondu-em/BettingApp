import { tokenStore } from './tokenStore'

/** An error response from the API (RFC 9457 problem details plus our stable `code`). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: Record<string, string[]>
  readonly retryAfter?: number

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string[]>,
    retryAfter?: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
  }
}

// Dev: "/api" (proxied by Vite). Production on another origin: set VITE_API_BASE_URL at build time.
const BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api'

let onUnauthorized: (() => void) | null = null

/** AuthProvider registers a handler so an expired/invalid token logs the user out. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  idempotencyKey?: string
  signal?: AbortSignal
}

function defaultCode(status: number): string {
  switch (status) {
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 429:
      return 'rate_limited'
    default:
      return 'http_error'
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get()
  const hasBody = options.body !== undefined

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (hasBody) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  // Network failures reject with a TypeError; callers (and describeError) deal with that.
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? (hasBody ? 'POST' : 'GET'),
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  let problem: { code?: string; detail?: string; title?: string; errors?: Record<string, string[]> } = {}
  try {
    problem = await response.json()
  } catch {
    /* 401/403 from the auth middleware have an empty body */
  }

  const retryAfter = Number(response.headers.get('Retry-After'))
  const error = new ApiError(
    response.status,
    problem.code ?? defaultCode(response.status),
    problem.detail ?? problem.title ?? response.statusText,
    problem.errors,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  )

  if (response.status === 401 && token) onUnauthorized?.()
  throw error
}
