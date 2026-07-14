import { useEffect, useState } from 'react'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function getNextSettlement(now: Date) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  const candidate = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 0, 0, 0)
  return new Date(now.getTime() < candidate ? candidate : candidate + 86_400_000)
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function useRoundClock(settlesAt?: string | null) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const configuredSettlement = settlesAt ? new Date(settlesAt) : null
  const nextSettlement = configuredSettlement && !Number.isNaN(configuredSettlement.getTime())
    ? configuredSettlement
    : getNextSettlement(now)

  return {
    nextSettlement,
    remaining: formatDuration(nextSettlement.getTime() - now.getTime()),
    elapsed: nextSettlement.getTime() <= now.getTime(),
  }
}
