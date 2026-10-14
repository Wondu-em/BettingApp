import { describeError } from '../lib/errors'

/** The coloured strip under a form: red for failures, amber for "try again / state changed". */
export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null
  const { message, tone } = describeError(error)
  const colours = tone === 'warn' ? 'bg-warn-bg text-warn-fg' : 'bg-bad-bg text-bad-fg'
  return (
    <div role="alert" className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${colours}`}>
      {message}
    </div>
  )
}
