import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import type { Role } from '../auth/jwt'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Pill } from '../components/Pill'

const AREAS: Record<string, string> = {
  '/wallet': 'Wallet',
  '/events': 'Events & bets',
  '/bets': 'My bets',
  '/admin': 'Overview',
  '/admin/events': 'Event console',
  '/admin/deposits': 'Deposits & webhooks',
  '/admin/audit': 'Audit log',
  '/admin/users': 'Users',
}

const PERMISSIONS: { capability: string; user: boolean; admin: boolean }[] = [
  { capability: 'Place bets', user: true, admin: false },
  { capability: 'Deposit and withdraw (own wallet)', user: true, admin: false },
  { capability: 'View own bets and history', user: true, admin: false },
  { capability: 'Create, close, settle, void events', user: false, admin: true },
  { capability: 'View all deposits and webhooks', user: false, admin: true },
  { capability: 'View audit log and users', user: false, admin: true },
]

function YesNo({ yes }: { yes: boolean }) {
  return <Pill tone={yes ? 'ok' : 'neutral'}>{yes ? 'Yes' : 'No'}</Pill>
}

/** Shown in place when a signed-in person opens an area their role does not allow. */
export function Forbidden({ required }: { required: Role }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const area = AREAS[pathname] ?? 'this area'
  const isAdmin = user?.role === 'Admin'

  return (
    <div className="space-y-5">
      <Card className="border-bad-fg/60">
        <Pill tone="bad">403 Forbidden</Pill>
        <h1 className="mt-3 text-2xl font-bold text-ink">You don&apos;t have access to {area}</h1>
        <p className="mt-1 text-sm text-muted">
          {required === 'Admin'
            ? 'This area is for administrators. '
            : 'This area is for users. Admins manage events and money operations but do not bet from the console. '}
          Your account role is {user?.role}. Actions are checked again on the server for every request.
        </p>
        <Button className="mt-4" onClick={() => navigate('/', { replace: true })}>
          {isAdmin ? 'Back to overview' : 'Back to wallet'}
        </Button>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-ink">Role permissions</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-2 font-semibold">Capability</th>
              <th className="w-28 py-2 font-semibold">User</th>
              <th className="w-28 py-2 font-semibold">Admin</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((row) => (
              <tr key={row.capability} className="border-b border-line last:border-0">
                <td className="py-2.5">{row.capability}</td>
                <td>
                  <YesNo yes={row.user} />
                </td>
                <td>
                  <YesNo yes={row.admin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
