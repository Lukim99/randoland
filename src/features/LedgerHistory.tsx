import { TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatKstDateTime, formatRp, movementClass } from '../lib/format'
import { loadLedgerPage } from '../services/market'
import type { LedgerEntry } from '../types/market'

const labels: Record<string, string> = {
  initial_balance: '초기 자금', buy: '매수 체결', sell: '매도 체결', short_open: '공매도 체결',
  short_cover: '청산', short_profit: '공매도 이익', short_loss: '공매도 손실',
  receivable_created: '미수 RP 발생', receivable_repayment: '미수 RP 상환',
  leverage_borrow: '레버리지 사용', leverage_repayment: '레버리지 상환', leverage_fee: '레버리지 차감',
  ladder_reward: '홀짝 보상', dividend: '주식 배당', admin_adjustment: '운영 조정',
}

function LedgerPages({ leagueId, operationsOnly }: { leagueId: string; operationsOnly: boolean }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [before, setBefore] = useState<LedgerEntry | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null)
    void loadLedgerPage(leagueId, operationsOnly, before, controller.signal).then((page) => {
      if (controller.signal.aborted) return
      setEntries((current) => before ? [...current, ...page.entries.filter((entry) => !current.some(({ id }) => id === entry.id))] : page.entries)
      setHasMore(page.hasMore)
    }).catch((nextError: unknown) => {
      if (!controller.signal.aborted) setError(nextError instanceof Error ? nextError.message : 'RP 내역을 불러오지 못했습니다.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [leagueId, operationsOnly, before, retry])

  return <>
    <div className="ledger-history">{entries.map((entry) => {
      const operating = entry.type === 'admin_adjustment'
      const revoke = entry.metadata.direction === 'revoke' || entry.amount < 0
      const reason = typeof entry.metadata.reason === 'string' ? entry.metadata.reason : null
      return <article key={entry.id}>
        <span className="ledger-icon">{entry.amount >= 0 ? <TrendingUp size={17} aria-hidden="true" /> : <TrendingDown size={17} aria-hidden="true" />}</span>
        <span><strong>{operating ? `운영 RP ${revoke ? '회수' : '지급'}` : labels[entry.type] ?? entry.type}</strong>
          <small>{formatKstDateTime(entry.createdAt)}</small>
          {operating && reason && <span className="ledger-reason">{reason}</span>}
          {operating && typeof entry.metadata.percent === 'number' && <small>기준 순자산 {formatRp(Number(entry.metadata.basisNetWorth))} × {entry.metadata.percent}%</small>}
        </span>
        <span><strong className={movementClass(entry.amount)}>{entry.amount > 0 ? '+' : ''}{formatRp(entry.amount)}</strong>
          {operating && <small>현금 {revoke ? '차감' : '지급'} {formatRp(Number(entry.metadata.cashApplied ?? Math.abs(entry.amount)))}</small>}
          {operating && Number(entry.metadata.receivableCreated) > 0 && <small>미수 발생 {formatRp(Number(entry.metadata.receivableCreated))}</small>}
          {operating && Number(entry.metadata.receivableRepaid) > 0 && <small>미수 상환 {formatRp(Number(entry.metadata.receivableRepaid))}</small>}
          <small>처리 후 예수금 {formatRp(entry.balanceAfter)}</small>
          {entry.receivableAfter > 0 && <small>처리 후 미수 {formatRp(entry.receivableAfter)}</small>}
        </span>
      </article>
    })}</div>
    {!entries.length && !loading && !error && <p className="muted-empty portfolio-empty">{operationsOnly ? '운영 지급·회수 내역이 없습니다.' : 'RP 내역이 없습니다.'}</p>}
    <div className="ledger-page-actions">
      {loading && <p role="status">RP 내역을 불러오는 중입니다.</p>}
      {error && <><p role="alert">{error}</p><button className="secondary-button" type="button" onClick={() => setRetry((value) => value + 1)}>다시 시도</button></>}
      {hasMore && !error && <button className="secondary-button" type="button" disabled={loading} onClick={() => setBefore(entries[entries.length - 1])}>이전 내역 더 보기</button>}
    </div>
  </>
}

export function LedgerHistory({ leagueId, latestEntryId }: { leagueId: string; latestEntryId?: string }) {
  const [operationsOnly, setOperationsOnly] = useState(false)
  const [revision, setRevision] = useState(0)
  return <>
    <div className="ledger-toolbar">
      <button className={operationsOnly ? 'secondary-button' : 'primary-button'} type="button" aria-pressed={!operationsOnly} onClick={() => setOperationsOnly(false)}>전체</button>
      <button className={operationsOnly ? 'primary-button' : 'secondary-button'} type="button" aria-pressed={operationsOnly} onClick={() => setOperationsOnly(true)}>운영 지급·회수</button>
      <button className="secondary-button" type="button" onClick={() => setRevision((value) => value + 1)}>새로고침</button>
    </div>
    <LedgerPages key={`${operationsOnly}:${revision}:${latestEntryId ?? ''}`} leagueId={leagueId} operationsOnly={operationsOnly} />
  </>
}
