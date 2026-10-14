import { api } from './client'
import type { MoneyMovement, Paged, WalletBalance, WalletTx } from './types'

export const walletApi = {
  balance: () => api<WalletBalance>('/wallet'),

  deposit: (amount: number, idempotencyKey: string) =>
    api<MoneyMovement>('/wallet/deposit', { method: 'POST', body: { amount }, idempotencyKey }),

  withdraw: (amount: number, idempotencyKey: string) =>
    api<MoneyMovement>('/wallet/withdraw', { method: 'POST', body: { amount }, idempotencyKey }),

  transactions: (page: number, pageSize: number) =>
    api<Paged<WalletTx>>(`/wallet/transactions?page=${page}&pageSize=${pageSize}`),
}
