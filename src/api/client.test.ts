import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, setUnauthorizedHandler } from './client'
import { tokenStore } from './tokenStore'
import { jsonResponse } from '../test/helpers'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  setUnauthorizedHandler(null)
})

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1)!
  return { url: url as string, init: init as RequestInit & { headers: Record<string, string> } }
}

describe('api()', () => {
  it('calls /api/<path> and parses JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ balance: 5 }))
    const result = await api<{ balance: number }>('/wallet')
    expect(result).toEqual({ balance: 5 })
    expect(lastRequest().url).toBe('/api/wallet')
    expect(lastRequest().init.method).toBe('GET')
  })

  it('sends the bearer token and the Idempotency-Key header', async () => {
    tokenStore.set('abc.def.ghi')
    fetchMock.mockResolvedValue(jsonResponse({}, 201))
    await api('/wallet/deposit', { body: { amount: 100 }, idempotencyKey: 'key-1' })
    const { init } = lastRequest()
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer abc.def.ghi')
    expect(init.headers['Idempotency-Key']).toBe('key-1')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ amount: 100 }))
  })

  it('omits Authorization and Idempotency-Key when not given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await api('/events')
    const { init } = lastRequest()
    expect(init.headers.Authorization).toBeUndefined()
    expect(init.headers['Idempotency-Key']).toBeUndefined()
  })

  it('turns a problem response into an ApiError with code, status and field errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: 'validation_failed', detail: 'bad', errors: { amount: ['Too big'] } }, 400),
    )
    const error = await api('/wallet/deposit', { body: {} }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, code: 'validation_failed', fieldErrors: { amount: ['Too big'] } })
  })

  it('reads Retry-After on a 429', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: 'rate_limited' }, 429, { 'Retry-After': '3' }))
    const error = (await api('/bets', { body: {} }).catch((e) => e)) as ApiError
    expect(error.retryAfter).toBe(3)
  })

  it('copes with an empty error body (401/403 from the auth middleware)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }))
    const error = (await api('/admin/events').catch((e) => e)) as ApiError
    expect(error).toMatchObject({ status: 403, code: 'forbidden' })
  })

  it('calls the unauthorized handler on 401 when a token was sent', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    tokenStore.set('abc.def.ghi')
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    await api('/wallet').catch(() => undefined)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does NOT call it for a failed login (no token was sent)', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    fetchMock.mockResolvedValue(jsonResponse({ code: 'invalid_credentials' }, 401))
    await api('/auth/login', { body: {} }).catch(() => undefined)
    expect(handler).not.toHaveBeenCalled()
  })

  it('lets network failures propagate as TypeError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api('/wallet')).rejects.toBeInstanceOf(TypeError)
  })
})
