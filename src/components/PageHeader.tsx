import { useAuth } from '../auth/useAuth'

export function PageHeader({ title }: { title: string }) {
  const { user } = useAuth()
  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-3xl font-bold text-ink">{title}</h1>
      {user && <span className="text-sm text-muted">Signed in as {user.email}</span>}
    </header>
  )
}
