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
