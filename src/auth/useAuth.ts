import { createContext, useContext } from 'react'
import type { SessionUser } from './jwt'

export interface AuthState {
  user: SessionUser | null
  login: (email: string, password: string) => Promise<SessionUser>
  /** Registers a new User-role account, then signs in. */
  register: (email: string, password: string) => Promise<SessionUser>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
