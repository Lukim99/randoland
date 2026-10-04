import type { AssetHistoryPoint, ParticipantAssetHistory } from '../types/market'

const kstDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
})

function kstDateKey(timestamp: number) {
  const parts = kstDate.formatToParts(timestamp)
  const part = (type: string) => parts.find((value) => value.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

const invalidHistory = () => new Error('자산 기록의 형식을 확인할 수 없습니다.')

/** Validate provenance and cutoffs without inventing values or filling days. */
export function normalizeAssetHistory(value: unknown): ParticipantAssetHistory {
  if (!value || typeof value !== 'object') throw invalidHistory()
  const history = value as ParticipantAssetHistory
  if (!['reconstructed_daily', 'published_snapshots'].includes(history.source)
    || !['ready', 'updating'].includes(history.status) || !Array.isArray(history.points)
    || history.formulaMode !== (history.source === 'reconstructed_daily' ? 'current_canonical_networth' : null)
    || (history.correctionAt !== null && (typeof history.correctionAt !== 'string' || !Number.isFinite(Date.parse(history.correctionAt))))
    || (history.status === 'updating' && history.points.length > 0)
    || (history.source === 'published_snapshots' && history.correctionAt !== null)) throw invalidHistory()

  const days = new Map<string, AssetHistoryPoint>()
  for (const raw of history.points) {
    if (!raw || typeof raw !== 'object') throw invalidHistory()
    const point = raw as AssetHistoryPoint
    const timestamp = Date.parse(point.asOf)
    const isDayEnd = point.kind === 'day_end'
    const isSnapshot = point.kind === 'snapshot'
    if (typeof point.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(point.date)
      || typeof point.asOf !== 'string' || !Number.isFinite(timestamp)
      || typeof point.asOfInclusive !== 'boolean' || point.asOfInclusive === isDayEnd
      || !['day_end', 'correction', 'snapshot'].includes(point.kind)
      || kstDateKey(timestamp - (isDayEnd ? 1 : 0)) !== point.date
      || (isDayEnd && kstDateKey(timestamp) === point.date)
      || !Number.isSafeInteger(point.netWorth)
      || (point.roundNumber !== null && (!Number.isInteger(point.roundNumber) || point.roundNumber < 0))
      || (isSnapshot && point.roundNumber === null)
      || (history.source === 'published_snapshots') !== isSnapshot
      || (point.kind === 'correction' && timestamp !== Date.parse(history.correctionAt ?? ''))) {
      throw invalidHistory()
    }

    const previous = days.get(point.date)
    if (!previous || timestamp > Date.parse(previous.asOf)
      || (timestamp === Date.parse(previous.asOf) && (point.roundNumber ?? 0) > (previous.roundNumber ?? 0))) {
      days.set(point.date, { date: point.date, asOf: point.asOf, asOfInclusive: point.asOfInclusive, netWorth: point.netWorth, roundNumber: point.roundNumber, kind: point.kind })
    }
  }
  return { source: history.source, status: history.status, formulaMode: history.formulaMode, correctionAt: history.correctionAt, points: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)) }
}

export function formatAssetDate(date: string) {
  return date.replaceAll('-', '.')
}
