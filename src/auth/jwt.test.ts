import { describe, expect, it } from 'vitest'
import { decodeToken } from './jwt'
import { makeToken } from '../test/helpers'

describe('decodeToken', () => {
  it('reads id, email, role and expiry', () => {
    const user = decodeToken(makeToken('Admin', { email: 'ops@example.com', id: 'abc' }))
    expect(user).toMatchObject({ id: 'abc', email: 'ops@example.com', role: 'Admin' })
    expect(user!.expiresAt).toBeGreaterThan(Date.now())
  })

  it('reports an already-expired token through expiresAt', () => {
    const user = decodeToken(makeToken('User', { expiresInSeconds: -60 }))
    expect(user!.expiresAt).toBeLessThan(Date.now())
  })

  it.each(['', 'not-a-jwt', 'a.b.c', 'a.%%%.c'])('returns null for garbage %j', (token) => {
    expect(decodeToken(token)).toBeNull()
  })

  it('rejects an unknown role', () => {
    const payload = btoa(JSON.stringify({ sub: '1', email: 'x@y.z', role: 'Root', exp: 9_999_999_999 }))
    expect(decodeToken(`h.${payload}.s`)).toBeNull()
  })
})
