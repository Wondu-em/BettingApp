// Hand-written from the backend DTOs (JSON is camelCase, enums are strings).

export type Paged<T> = { items: T[]; page: number; pageSize: number; total: number }

export type TokenResponse = { accessToken: string; tokenType: 'Bearer'; expiresAt: string }
export type RegisterResponse = { userId: string; email: string }

export type WalletBalance = { walletId: string; balance: number; currency: string }
export type MoneyMovement = { transactionId: string; amount: number; balance: number }

export type TxType = 'Deposit' | 'Withdraw' | 'BetStake' | 'Payout' | 'Refund' | 'Sweep'
export type WalletTx = {
  transactionId: string
  type: TxType
  direction: 'Credit' | 'Debit'
  amount: number
  referenceType: string
  referenceId: string | null
  createdAt: string
}

export type EventStatus = 'Open' | 'Closed' | 'Settled' | 'Voided'
export type Outcome = { id: string; name: string; odds: number; oddsBp: number }
export type BettingEvent = {
  id: string
  title: string
  status: EventStatus
  winningOutcomeId: string | null
  createdAt: string
  settledAt: string | null
  outcomes: Outcome[]
}

export type BetStatus = 'Placed' | 'Won' | 'Lost' | 'Refunded'
export type Bet = {
  id: string
  eventId: string
  outcomeId: string
  stake: number
  oddsBp: number
  odds: number
  status: BetStatus
  payout: number | null
  potentialPayout: number
  placedAt: string
  settledAt: string | null
}
export type PlacedBet = { bet: Bet; balance: number }
