import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatKstDateTime, formatPrice, formatQuantity } from '../lib/format'
import { loadAdminExecutionPage } from '../services/admin'
import type { AdminExecutionPage, AdminLeague, AdminOpenOrderSide } from '../types/admin'

interface AdminOrderMonitorPanelProps {
  leagues: AdminLeague[]
  onInspectStock: (stock: { id: string; name: string }) => void
}

const sideLabels: Record<AdminOpenOrderSide, string> = {
  buy: '일반 매수',
  sell: '보유 주식 매도',
  short: '공매도',
  cover: '공매도 청산',
}

export function AdminOrderMonitorPanel({ leagues, onInspectStock }: AdminOrderMonitorPanelProps) {
  const [request, setRequest] = useState({ leagueId: null as string | null, query: '', page: 1, asOf: null as string | null })
  const [result, setResult] = useState<AdminExecutionPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const timer = window.setTimeout(() => {
      void loadAdminExecutionPage(request, controller.signal).then((page) => {
        if (!controller.signal.aborted) setResult(page)
      }).catch((nextError: unknown) => {
        if (!controller.signal.aborted) setError(nextError instanceof Error ? nextError.message : '체결 내역을 불러오지 못했습니다.')
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    }, 200)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [request])

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1
  const orders = !loading && !error ? result?.orders ?? [] : []

  function changePage(page: number) {
    if (!result) return
    setRequest({ ...request, page, asOf: result.asOf })
  }

  return (
    <section className="admin-panel admin-panel--orders">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><ClipboardList size={19} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">EXECUTIONS</span>
          <h2>실시간 체결 모니터링</h2>
          <p>종목명을 누르면 현재 보유·공매도 플레이어를 확인할 수 있습니다.</p>
        </div>
        <span className="count-chip">{loading ? '조회 중' : error ? '-' : `${formatQuantity(result?.total ?? 0)}건`}</span>
      </header>

      <div className="admin-order-monitor-toolbar">
        <label>
          <span className="sr-only">리그 선택</span>
          <select value={request.leagueId ?? 'all'} onChange={(event) => setRequest({ ...request, leagueId: event.target.value === 'all' ? null : event.target.value, page: 1, asOf: null })}>
            <option value="all">전체 리그</option>
            {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
          </select>
        </label>
        <div className="admin-search">
          <Search size={16} aria-hidden="true" />
          <input value={request.query} maxLength={100}
            onChange={(event) => setRequest({ ...request, query: event.target.value, page: 1, asOf: null })}
            placeholder="플레이어·종목·티커 검색" aria-label="주문 플레이어 또는 종목 검색" />
        </div>
      </div>

      {error && <p className="admin-feedback is-error" role="alert">{error}</p>}
      <div className="admin-table-wrap admin-order-table-wrap" aria-busy={loading}>
        <table className="admin-table admin-order-table admin-responsive-table">
          <thead><tr><th>플레이어</th><th>리그</th><th>종목</th><th>거래 형태</th><th>수량</th><th>체결가</th><th>레버리지</th><th>라운드</th><th>체결 시각</th></tr></thead>
          <tbody>
            {orders.length > 0 ? orders.map((order) => (
              <tr key={order.id}>
                <td data-label="플레이어"><strong>{order.participantNickname}</strong></td>
                <td data-label="리그">{order.leagueName}</td>
                <td data-label="종목"><button className="admin-participant-select admin-order-stock" type="button" onClick={() => onInspectStock({ id: order.stockId, name: order.stockName })} aria-label={`${order.stockName} 보유·공매도 플레이어 조회`}><strong>{order.stockName}</strong><small>{order.ticker}</small></button></td>
                <td data-label="거래 형태">{sideLabels[order.side]}</td>
                <td data-label="수량">{formatQuantity(order.requestedQuantity)}주</td>
                <td data-label="체결가">{formatPrice(order.orderPrice)} RP</td>
                <td data-label="레버리지">{order.leveragePercent > 0 ? `${formatPrice(order.leveragePercent)}%` : '-'}</td>
                <td data-label="라운드">{order.roundNumber}라운드</td>
                <td data-label="체결 시각">{formatKstDateTime(order.executedAt)}</td>
              </tr>
            )) : <tr><td className="admin-table-empty" colSpan={9}>{loading ? '체결 내역을 불러오는 중입니다.' : error ? '체결 내역을 다시 조회해 주세요.' : '조건에 맞는 체결 기록이 없습니다.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <nav className="admin-pagination" aria-label="체결 내역 페이지">
        <button className="secondary-button" type="button" disabled={loading} onClick={() => setRequest({ ...request, page: 1, asOf: null })}><RefreshCw size={14} aria-hidden="true" /> 최신 내역</button>
        <span role="status">{loading ? '조회 중' : error ? '조회 실패' : `${result?.page ?? 1} / ${totalPages} 페이지`}</span>
        <div>
          <button className="secondary-button" type="button" aria-label="이전 체결 페이지" disabled={loading || !!error || !result || result.page <= 1} onClick={() => changePage((result?.page ?? 1) - 1)}><ChevronLeft size={16} aria-hidden="true" /> 이전</button>
          <button className="secondary-button" type="button" aria-label="다음 체결 페이지" disabled={loading || !!error || !result || result.page >= totalPages} onClick={() => changePage((result?.page ?? 1) + 1)}>다음 <ChevronRight size={16} aria-hidden="true" /></button>
        </div>
      </nav>
    </section>
  )
}
