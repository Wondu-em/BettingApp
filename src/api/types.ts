// Hand-written from the backend DTOs (JSON is camelCase, enums are strings).

export type Paged<T> = { items: T[]; page: number; pageSize: number; total: number }

export type TokenResponse = { accessToken: string; tokenType: 'Bearer'; expiresAt: string }
export type RegisterResponse = { userId: string; email: string }
export type UserRole = 'User' | 'Admin'

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

export type SettlementResult = {
  eventId: string
  status: EventStatus
  winningOutcomeId: string | null
  winningBets: number
  losingBets: number
  totalStaked: number
  totalPaidOut: number
  houseResult: number // stakes - payouts: positive = house profit
  settledAt: string
}

export type VoidResult = {
  eventId: string
  status: EventStatus
  betsRefunded: number
  totalRefunded: number
  reason: string | null
  voidedAt: string
}

export type AdminOverview = {
  totalUsers: number
  totalEvents: number
  openEvents: number
  closedEvents: number
  settledEvents: number
  voidedEvents: number
  totalBets: number
  placedBets: number
  wonBets: number
  lostBets: number
  refundedBets: number
  totalDeposits: number
  pendingDeposits: number
  confirmedDeposits: number
  failedDeposits: number
  confirmedDepositAmount: number
  totalWalletBalance: number
}

export type AdminUser = {
  id: string
  email: string
  role: 'User' | 'Admin'
  createdAt: string
  walletBalance: number | null
  currency: string | null
}

export type AdminAuditEntry = {
  id: number
  actorId: string | null
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  data: string
  correlationId: string | null
  at: string
}

export type ProviderDepositStatus = 'Pending' | 'Confirmed' | 'Failed'
export type AdminDeposit = {
  id: string
  providerReference: string
  userId: string
  userEmail: string
  amount: number
  status: ProviderDepositStatus
  ledgerTransactionId: string | null
  createdAt: string
  updatedAt: string
}

export type AdminWebhookDelivery = {
  id: string
  providerEventId: string
  eventType: string
  result: string | null
  receivedAt: string
  processedAt: string | null
}
