import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { ErrorBanner } from '../components/ErrorBanner'
import { Field } from '../components/Field'
import { describeError } from '../lib/errors'

type Mode = 'signin' | 'register'

export function Login() {
  const { user, login, register } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (user) return <Navigate to={from} replace />

  const fieldErrors = error ? describeError(error).fieldErrors : undefined

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'signin') await login(email, password)
      else await register(email, password)
      // On success `user` is set and this screen redirects itself.
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => switchMode(value)}
      className={`rounded-lg border px-4 py-2.5 font-semibold transition ${
        mode === value ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-white text-ink hover:bg-page'
      }`}
    >
      {label}
    </button>
  )

  return (
    <main className="grid min-h-screen place-items-center bg-page p-4">
      <div className="w-full max-w-[470px] rounded-card border border-line bg-card p-8">
        <h1 className="mb-5 text-2xl font-bold text-ink">Wallet &amp; Bets</h1>

        <div role="tablist" aria-label="Account" className="mb-5 grid grid-cols-2 gap-3">
          {tab('signin', 'Sign in')}
          {tab('register', 'Register')}
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors?.email?.[0]}
          />
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors?.password?.[0]}
          />

          <ErrorBanner error={error} />

          <Button type="submit" fullWidth disabled={pending}>
            {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          New accounts are always created as users with a wallet in ETB. Admin access is granted by an administrator,
          never at sign-up. After sign-in you land on the user app or the admin console based on your role.
        </p>
      </div>
    </main>
  )
}
