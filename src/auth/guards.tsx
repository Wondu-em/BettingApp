import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { Role } from './jwt'
import { Forbidden } from '../pages/Forbidden'

/** Anonymous visitors are sent to /login and come back to where they were going. */
export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/**
 * Wrong role: show the 403 screen in place (inside the person's own layout) instead of redirecting.
 * This is a convenience only. The server re-checks the role on every request.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()
  if (user?.role !== role) return <Forbidden required={role} />
  return <Outlet />
}

/** "/" lands on the right home for the signed-in role. */
export function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'Admin' ? '/admin' : '/wallet'} replace />
}
