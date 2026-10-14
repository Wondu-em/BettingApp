import { useEffect, useState } from 'react'

/** Counts down whole seconds after start(); used to disable "Place bet" after a 429. */
export function useCountdown() {
  const [until, setUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (until === null) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) setUntil(null)
    }, 250)
    return () => clearInterval(timer)
  }, [until])

  const remaining = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000))

  return {
    remaining,
    start(seconds: number) {
      const current = Date.now()
      setNow(current)
      setUntil(current + seconds * 1000)
    },
  }
}
