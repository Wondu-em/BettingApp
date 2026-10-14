import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from './api/client'
import { AuthProvider } from './auth/AuthContext'
import { HomeRedirect, RequireAuth, RequireRole } from './auth/guards'
import { AppShell } from './layouts/AppShell'
import { ComingSoon } from './pages/ComingSoon'
import { Events } from './pages/Events'
import { Login } from './pages/Login'
import { MyBets } from './pages/MyBets'
import { NotFound } from './pages/NotFound'
import { Wallet } from './pages/Wallet'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry network blips and 5xx (a sleeping server), never 4xx: those will not change by asking again.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
})

/** Routes only, so tests can render them inside a MemoryRouter. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />

          <Route element={<RequireRole role="User" />}>
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/events" element={<Events />} />
            <Route path="/bets" element={<MyBets />} />
          </Route>

          <Route element={<RequireRole role="Admin" />}>
            <Route path="/admin" element={<ComingSoon title="Overview" />} />
            <Route path="/admin/events" element={<ComingSoon title="Event console" />} />
            <Route path="/admin/deposits" element={<ComingSoon title="Deposits & webhooks" />} />
            <Route path="/admin/audit" element={<ComingSoon title="Audit log" />} />
            <Route path="/admin/users" element={<ComingSoon title="Users" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
