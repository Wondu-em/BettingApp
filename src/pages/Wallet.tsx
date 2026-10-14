import { useId, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { walletApi } from '../api/wallet'
import type { WalletBalance } from '../api/types'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorBanner } from '../components/ErrorBanner'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { Pill } from '../components/Pill'
import { describeError } from '../lib/errors'
import { formatDateTime } from '../lib/format'
import { useIdempotencyKey } from '../lib/idempotency'
import { TX_LABEL, TX_TONE, describeReference } from '../lib/labels'
import { formatEtb, formatSigned, validateAmount } from '../lib/money'
import { useDelayedFlag } from '../lib/useDelayedFlag'

const PAGE_SIZE = 5

type Kind = 'deposit' | 'withdraw'

export function Wallet() {
  const queryClient = useQueryClient()
  const amountId = useId()
  const [amountText, setAmountText] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // One key per intent. Retrying the same attempt reuses it; editing the amount or succeeding rotates it.
  const depositKey = useIdempotencyKey()
  const withdrawKey = useIdempotencyKey()

  const balance = useQuery({ queryKey: ['wallet'], queryFn: walletApi.balance })
  const history = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => walletApi.transactions(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  })

  const move = useMutation({
    mutationFn: ({ kind, minor, key }: { kind: Kind; minor: number; key: string }) =>
      kind === 'deposit' ? walletApi.deposit(minor, key) : walletApi.withdraw(minor, key),
    onSuccess: (result, { kind }) => {
      queryClient.setQueryData<WalletBalance>(['wallet'], (old) => (old ? { ...old, balance: result.balance } : old))
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setPage(1)
      setAmountText('')
      depositKey.rotate()
      withdrawKey.rotate()
      setNotice(
        `${kind === 'deposit' ? 'Deposited' : 'Withdrew'} ${formatEtb(result.amount)}. New balance ${formatEtb(result.balance)}.`,
      )
    },
  })

  function onAmountChange(value: string) {
    setAmountText(value)
    setFieldError(null)
    setNotice(null)
    depositKey.rotate() // a different amount is a different intent
    withdrawKey.rotate()
  }

  function submit(kind: Kind) {
    setNotice(null)
    move.reset()
    const check = validateAmount(amountText)
    if (!check.ok) {
      setFieldError(check.error)
      return
    }
    setFieldError(null)
    move.mutate({ kind, minor: check.minor, key: (kind === 'deposit' ? depositKey : withdrawKey).current() })
  }

  const waking = useDelayedFlag(balance.isLoading, 4000)
  const pageCount = Math.max(1, Math.ceil((history.data?.total ?? 0) / PAGE_SIZE))
  const serverFieldError = move.error ? describeError(move.error).fieldErrors?.amount?.[0] : undefined

  return (
    <>
      <PageHeader title="Wallet" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Available balance</p>
          {balance.data ? (
            <>
              <p className="mt-2 text-5xl font-bold tracking-tight text-ink">{formatEtb(balance.data.balance)}</p>
              <p className="mt-3 text-sm text-muted">
                Stored as integer minor units ({balance.data.balance.toLocaleString('en-US')})
              </p>
            </>
          ) : balance.isError ? (
            <div className="mt-3 space-y-3">
              <ErrorBanner error={balance.error} />
              <Button variant="secondary" onClick={() => void balance.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-5xl font-bold text-line">ETB …</p>
              {waking && (
                <Notice tone="warn">The server may be waking up after a period of inactivity. This can take up to a minute.</Notice>
              )}
            </div>
          )}
        </Card>

        <Card>
          <label htmlFor={amountId} className="mb-1.5 block text-sm font-semibold text-ink">
            Amount (ETB)
          </label>
          <div className="flex gap-3">
            <input
              id={amountId}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amountText}
              onChange={(e) => onAmountChange(e.target.value)}
              aria-invalid={fieldError || serverFieldError ? true : undefined}
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <Button disabled={move.isPending} onClick={() => submit('deposit')}>
              Deposit
            </Button>
            <Button variant="secondary" disabled={move.isPending} onClick={() => submit('withdraw')}>
              Withdraw
            </Button>
          </div>

          {(fieldError || serverFieldError) && (
            <p className="mt-1.5 text-xs font-semibold text-bad-fg">{fieldError ?? serverFieldError}</p>
          )}
          <p className="mt-3 text-sm text-muted">Retrying the same request is safe: it can never be applied twice.</p>

          <div className="mt-3 space-y-2">
            {notice && <Notice>{notice}</Notice>}
            <ErrorBanner error={move.error} />
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="mb-3 text-lg font-bold text-ink">Transaction history</h2>

        {history.isError && !history.data ? (
          <div className="space-y-3">
            <ErrorBanner error={history.error} />
            <Button variant="secondary" onClick={() => void history.refetch()}>
              Retry
            </Button>
          </div>
        ) : history.data && history.data.items.length === 0 ? (
          <p className="py-4 text-sm text-muted">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Reference</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {(history.data?.items ?? []).map((tx) => (
                  <tr key={`${tx.transactionId}-${tx.direction}`} className="border-b border-line last:border-0">
                    <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                    <td className="px-3 py-3">
                      <Pill tone={TX_TONE[tx.type] ?? 'neutral'}>{TX_LABEL[tx.type] ?? tx.type}</Pill>
                    </td>
                    <td className="px-3 py-3">{describeReference(tx.referenceType, tx.referenceId)}</td>
                    <td
                      className={`px-3 py-3 text-right tabular-nums ${tx.direction === 'Credit' ? 'text-ok-fg' : 'text-ink'}`}
                    >
                      {formatSigned(tx.amount, tx.direction)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {history.data && history.data.total > 0 && <Pagination page={page} pageCount={pageCount} onChange={setPage} />}
      </Card>
    </>
  )
}
