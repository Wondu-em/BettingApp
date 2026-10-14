import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeToken, renderApp } from '../test/helpers'
import { mockApi, type Handler } from '../test/mockApi'
import { tokenStore } from '../api/tokenStore'

afterEach(() => vi.unstubAllGlobals())

/** After sign-in the app loads the wallet, so the fake backend answers those calls too. */
function backend(overrides: Record<string, Handler> = {}) {
  return mockApi({
    'GET /api/wallet': () => jsonResponse({ walletId: 'w1', balance: 0, currency: 'ETB' }),
    'GET /api/wallet/transactions': () => jsonResponse({ items: [], page: 1, pageSize: 5, total: 0 }),
    ...overrides,
  })
}

const tokenResponse = (role: 'User' | 'Admin', email?: string) =>
  jsonResponse({ accessToken: makeToken(role, { email }), tokenType: 'Bearer', expiresAt: '' })

async function fill(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  return user
}

describe('Login screen', () => {
  it('shows "Invalid email or password" for bad credentials and stays on the screen', async () => {
    backend({
      'POST /api/auth/login': () => jsonResponse({ code: 'invalid_credentials', detail: 'Invalid email or password.' }, 401),
    })
    renderApp('/login')

    const user = await fill('user@example.com', 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(tokenStore.get()).toBeNull()
  })

  it('signs a User in and lands on the wallet', async () => {
    const { calls } = backend({ 'POST /api/auth/login': () => tokenResponse('User') })
    renderApp('/login')

    const user = await fill('user@example.com', 'Passw0rd!123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Wallet' })).toBeInTheDocument()
    expect(tokenStore.get()).not.toBeNull()
    const login = calls.find((c) => c.key === 'POST /api/auth/login')!
    expect(login.body).toEqual({ email: 'user@example.com', password: 'Passw0rd!123' })
  })

  it('signs an Admin in and lands on the admin overview', async () => {
    backend({ 'POST /api/auth/login': () => tokenResponse('Admin') })
    renderApp('/login')

    const user = await fill('admin@example.com', 'ChangeMe123!')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })

  it('registers, then signs in automatically', async () => {
    const { calls } = backend({
      'POST /api/auth/register': () => jsonResponse({ userId: 'u1', email: 'new@example.com' }, 201),
      'POST /api/auth/login': () => tokenResponse('User', 'new@example.com'),
    })
    renderApp('/login')

    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Register' }))
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText(/signed in as new@example.com/i)).toBeInTheDocument()
    expect(calls.map((c) => c.key).filter((k) => k.includes('/auth/'))).toEqual([
      'POST /api/auth/register',
      'POST /api/auth/login',
    ])
  })

  it('shows server field errors next to the right input', async () => {
    backend({
      'POST /api/auth/register': () =>
        jsonResponse(
          {
            code: 'validation_failed',
            errors: {
              email: ['A valid email address is required.'],
              password: ['Password must be between 8 and 128 characters.'],
            },
          },
          400,
        ),
    })
    renderApp('/login')

    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Register' }))
    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(screen.getByText('A valid email address is required.')).toBeInTheDocument())
    expect(screen.getByText('Password must be between 8 and 128 characters.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('disables the button while the request is in flight', async () => {
    let release!: (r: Response) => void
    backend({ 'POST /api/auth/login': () => new Promise<Response>((resolve) => (release = resolve)) })
    renderApp('/login')

    const user = await fill('user@example.com', 'Passw0rd!123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('button', { name: /please wait/i })).toBeDisabled()
    release(jsonResponse({ code: 'invalid_credentials' }, 401))
    await screen.findByRole('alert')
  })
})
