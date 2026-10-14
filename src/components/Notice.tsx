import type { ReactNode } from 'react'

const tones = {
  ok: 'bg-ok-bg text-ok-fg',
  warn: 'bg-warn-bg text-warn-fg',
  bad: 'bg-bad-bg text-bad-fg',
}

/** A small status strip for success and informational messages (errors use ErrorBanner). */
export function Notice({ tone = 'ok', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <div role="status" className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </div>
  )
}
