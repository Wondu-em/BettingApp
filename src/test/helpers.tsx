import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthContext'
import { AppRoutes } from '../App'
import { tokenStore } from '../api/tokenStore'
import type { Role } from '../auth/jwt'

function base64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** An unsigned, fake JWT carrying the claims the backend issues. Good enough: the UI never verifies it. */
export function makeToken(
  role: Role,
  options: { email?: string; id?: string; expiresInSeconds?: number } = {},
): string {
  const { email = `${role.toLowerCase()}@example.com`, id = '11111111-1111-1111-1111-111111111111', expiresInSeconds = 3600 } =
    options
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: id, email, role, exp })}.signature`
}

export function signInAs(role: Role, options?: Parameters<typeof makeToken>[1]) {
  tokenStore.set(makeToken(role, options))
}

export function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
