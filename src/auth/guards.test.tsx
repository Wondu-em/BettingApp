import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, signInAs } from '../test/helpers'

describe('route guards', () => {
  it('sends an anonymous visitor to the sign-in screen', () => {
    renderApp('/wallet')
    expect(screen.getByRole('heading', { name: /wallet & bets/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows the 403 screen, inside the user layout, when a User opens the Event console', () => {
    signInAs('User', { email: 'user@example.com' })
    renderApp('/admin/events')

    expect(screen.getByText('403 Forbidden')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /you don.t have access to event console/i })).toBeInTheDocument()
    expect(screen.getByText(/your account role is user/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to wallet' })).toBeInTheDocument()
    // still inside the user's own layout
    expect(screen.getByRole('link', { name: 'Events & bets' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Event console' })).not.toBeInTheDocument()
  })

  it('shows the 403 screen to an Admin who opens a user-only area', () => {
    signInAs('Admin')
    renderApp('/wallet')
    expect(screen.getByText('403 Forbidden')).toBeInTheDocument()
    expect(screen.getByText(/this area is for users/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to overview' })).toBeInTheDocument()
  })

  it('lets a User into the wallet area', () => {
    signInAs('User')
    renderApp('/wallet')
    expect(screen.getByRole('heading', { name: 'Wallet' })).toBeInTheDocument()
    expect(screen.getByText(/signed in as user@example.com/i)).toBeInTheDocument()
    expect(screen.queryByText('403 Forbidden')).not.toBeInTheDocument()
  })

  it('lets an Admin into the console and shows the admin sidebar', () => {
    signInAs('Admin')
    renderApp('/admin/events')
    expect(screen.getByRole('heading', { name: 'Event console' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Audit log' })).toBeInTheDocument()
    expect(screen.getByText('Role: Admin')).toBeInTheDocument()
  })

  it('lands each role on its own home page from "/"', () => {
    signInAs('Admin')
    const { unmount } = renderApp('/')
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    unmount()
    sessionStorage.clear()

    signInAs('User')
    renderApp('/')
    expect(screen.getByRole('heading', { name: 'Wallet' })).toBeInTheDocument()
  })

  it('ignores an expired token left in storage', () => {
    signInAs('User', { expiresInSeconds: -10 })
    renderApp('/wallet')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })
})
