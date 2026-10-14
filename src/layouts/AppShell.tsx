import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

type NavItem = { to: string; label: string; end?: boolean }

const USER_NAV: NavItem[] = [
  { to: '/wallet', label: 'Wallet' },
  { to: '/events', label: 'Events & bets' },
  { to: '/bets', label: 'My bets' },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/events', label: 'Event console' },
  { to: '/admin/deposits', label: 'Deposits & webhooks' },
  { to: '/admin/audit', label: 'Audit log' },
  { to: '/admin/users', label: 'Users' },
]

/** Sidebar + content. Navy for users, brown for admins, as in the design. */
export function AppShell() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const items = isAdmin ? ADMIN_NAV : USER_NAV

  return (
    <div className="flex min-h-screen">
      <aside className={`flex w-56 shrink-0 flex-col px-4 py-6 text-white ${isAdmin ? 'bg-side-admin' : 'bg-side-user'}`}>
        <div className="px-3">
          <div className="text-xl font-bold">Wallet &amp; Bets</div>
          {isAdmin && (
            <span className="mt-2 inline-block rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-semibold text-warn-fg">
              Admin
            </span>
          )}
        </div>

        <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-side-user-active font-semibold text-white' : 'text-white/75 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center justify-between px-3 pt-6 text-sm text-white/60">
          <span>Role: {user?.role}</span>
          <button type="button" onClick={logout} className="font-semibold text-white/80 underline-offset-2 hover:underline">
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
