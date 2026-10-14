import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { describeError } from './errors'

describe('describeError', () => {
  it('explains insufficient funds in red', () => {
    const view = describeError(new ApiError(422, 'insufficient_funds', 'x'))
    expect(view.tone).toBe('bad')
    expect(view.message).toContain('Insufficient funds')
    expect(view.message).toContain('422')
  })

  it('shows a conflict (e.g. event closed) in amber with the server message', () => {
    const view = describeError(new ApiError(409, 'conflict', 'Event is not open for betting.'))
    expect(view.tone).toBe('warn')
    expect(view.message).toContain('Event is not open for betting.')
    expect(view.message).toContain('409')
  })

  it('includes the retry delay for rate limiting', () => {
    const view = describeError(new ApiError(429, 'rate_limited', 'x', undefined, 7))
    expect(view.tone).toBe('warn')
    expect(view.message).toContain('7 s')
  })

  it('passes field errors through for validation failures', () => {
    const view = describeError(new ApiError(400, 'validation_failed', 'x', { email: ['A valid email is required.'] }))
    expect(view.fieldErrors?.email?.[0]).toBe('A valid email is required.')
  })

  it('maps credential failures', () => {
    expect(describeError(new ApiError(401, 'invalid_credentials', 'x')).message).toBe('Invalid email or password')
  })

  it('maps the body-less 403 from the auth middleware', () => {
    expect(describeError(new ApiError(403, 'forbidden', 'Forbidden')).message).toContain('permission')
  })

  it('hides server internals on 5xx', () => {
    const view = describeError(new ApiError(500, 'internal_error', 'secret stack trace'))
    expect(view.message).not.toContain('secret')
  })

  it('recognises a network failure and says retrying is safe', () => {
    const view = describeError(new TypeError('Failed to fetch'))
    expect(view.tone).toBe('warn')
    expect(view.message).toContain('Retrying is safe')
  })

  it('handles non-Error values', () => {
    expect(describeError('boom').message).toBe('Something went wrong.')
  })
})
