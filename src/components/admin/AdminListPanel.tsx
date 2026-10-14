import type { ReactNode } from 'react'
import { Button } from '../Button'
import { Card } from '../Card'
import { ErrorBanner } from '../ErrorBanner'
import { Pagination } from '../Pagination'

interface Props {
  title: string
  total: number | undefined
  page: number
  pageSize: number
  isLoading: boolean
  error: unknown
  onRetry: () => void
  onPageChange: (page: number) => void
  emptyMessage: string
  children: ReactNode
}

export function AdminListPanel({
  title,
  total,
  page,
  pageSize,
  isLoading,
  error,
  onRetry,
  onPageChange,
  emptyMessage,
  children,
}: Props) {
  const pageCount = Math.max(1, Math.ceil((total ?? 0) / pageSize))

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {total !== undefined && <span className="text-sm text-muted">{total.toLocaleString()} total</span>}
      </div>

      {error && total === undefined ? (
        <div className="space-y-3">
          <ErrorBanner error={error} />
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : isLoading && total === undefined ? (
        <p role="status" className="py-4 text-sm text-muted">
          Loading…
        </p>
      ) : total === 0 ? (
        <div className="space-y-3">
          {error ? (
            <>
              <ErrorBanner error={error} />
              <Button variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            </>
          ) : null}
          <p className="py-4 text-sm text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-3 space-y-2">
              <ErrorBanner error={error} />
              <Button variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            </div>
          )}
          {children}
          <Pagination page={page} pageCount={pageCount} onChange={onPageChange} />
        </>
      )}
    </Card>
  )
}

export function AdminFilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block min-w-0 flex-1 text-sm font-semibold text-ink">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 block w-full rounded-lg border border-line bg-white px-3 py-2 font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  )
}

export function AdminFilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block min-w-40 text-sm font-semibold text-ink">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 block w-full rounded-lg border border-line bg-white px-3 py-2 font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
