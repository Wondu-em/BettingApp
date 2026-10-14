import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import { tokenStore } from '../api/tokenStore'
import { decodeToken, type SessionUser } from './jwt'
import { AuthContext } from './useAuth'

function restoreSession(): SessionUser | null {
  const token = tokenStore.get()
  if (!token) return null
  const user = decodeToken(token)
  if (!user || user.expiresAt <= Date.now()) {
    tokenStore.clear()
    return null
  }
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<SessionUser | null>(restoreSession)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    queryClient.clear() // never show the previous person's cached wallet or bets
  }, [queryClient])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    const session = decodeToken(response.accessToken)
    if (!session) throw new Error('The server returned an invalid token.')
    tokenStore.set(response.accessToken)
    setUser(session)
    return session
  }, [])

  const register = useCallback(
    async (email: string, password: string) => {
      await authApi.register(email, password)
      return login(email, password)
    },
    [login],
  )

  // A 401 from any request means the token is no longer valid.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Sign out automatically when the token expires.
  useEffect(() => {
    if (!user) return
    const delay = Math.min(Math.max(user.expiresAt - Date.now(), 0), 2 ** 31 - 1)
    const timer = setTimeout(logout, delay)
    return () => clearTimeout(timer)
  }, [user, logout])

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
