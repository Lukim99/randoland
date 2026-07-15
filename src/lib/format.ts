export function formatPrice(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value))
}

export function formatRp(value: number) {
  return `${formatPrice(value)} RP`
}

export function formatPercent(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function movementClass(value: number) {
  if (value > 0) return 'is-up'
  if (value < 0) return 'is-down'
  return 'is-flat'
}

export function formatKstDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function formatDiscussionTime(value: string, now = new Date()) {
  const createdAt = new Date(value)
  const elapsedSeconds = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / 1000))

  if (elapsedSeconds < 60) return `${elapsedSeconds}초 전`

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}시간 전`

  const elapsedDays = Math.floor(elapsedHours / 24)
  if (elapsedDays < 2) return `${elapsedDays}일 전`

  const includeYear = createdAt.getFullYear() !== now.getFullYear()
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: includeYear ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
  }).format(createdAt)
}
