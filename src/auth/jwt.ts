export type Role = 'User' | 'Admin'

export interface SessionUser {
  id: string
  email: string
  role: Role
  /** Expiry as epoch milliseconds. */
  expiresAt: number
}

/**
 * Reads the claims out of the access token for DISPLAY and routing only.
 * It does not verify the signature: the server checks the token and the role on every request.
 */
export function decodeToken(token: string): SessionUser | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const binary = atob(base64)
    const json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
    const claims = JSON.parse(json) as Record<string, unknown>

    const { sub, email, role, exp } = claims
    if (typeof sub !== 'string' || typeof email !== 'string' || typeof exp !== 'number') return null
    if (role !== 'User' && role !== 'Admin') return null

    return { id: sub, email, role, expiresAt: exp * 1000 }
  } catch {
    return null
  }
}
