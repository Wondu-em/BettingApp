import { api } from './client'
import type { RegisterResponse, TokenResponse } from './types'

export const authApi = {
  login: (email: string, password: string) =>
    api<TokenResponse>('/auth/login', { method: 'POST', body: { email, password } }),

  register: (email: string, password: string) =>
    api<RegisterResponse>('/auth/register', { method: 'POST', body: { email, password } }),
}
