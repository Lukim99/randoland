import { ClipboardList, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatKstDateTime, formatPrice } from '../lib/format'
import type { AdminLeague, AdminOpenOrder, AdminOpenOrderSide } from '../types/admin'

interface AdminOrderMonitorPanelProps {
  leagues: AdminLeague[]
  orders: AdminOpenOrder[]
}

const sideLabels: Record<AdminOpenOrderSide, string> = {
  buy: '일반 매수',
  sell: '보유 주식 매도',
  short: '공매도',
  cover: '공매도 청산',
}

export function AdminOrderMonitorPanel({ leagues, orders }: AdminOrderMonitorPanelProps) {
  const [leagueId, setLeagueId] = useState('all')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const visibleOrders = useMemo(() => orders.filter((order) => (
    (leagueId === 'all' || order.leagueId === leagueId)
    && (
      !normalizedQuery
      || order.participantNickname.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
      || order.stockName.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
      || order.ticker.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
    )
  )), [leagueId, normalizedQuery, orders])

  return (
    <section className="admin-panel admin-panel--orders">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><ClipboardList size={19} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">OPEN ORDERS</span>
          <h2>플레이어 주문 모니터링</h2>
          <p>현재 접수 대기 또는 정산 잠금 상태인 주문을 조회합니다.</p>
        </div>
        <span className="count-chip" aria-label={`조회된 주문 ${visibleOrders.length}건`}>{visibleOrders.length}</span>
      </header>

      <div className="admin-order-monitor-toolbar">
        <label>
          <span className="sr-only">리그 선택</span>
          <select value={leagueId} onChange={(event) => setLeagueId(event.target.value)}>
            <option value="all">전체 리그</option>
            {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
          </select>
        </label>
        <div className="admin-search">
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="플레이어·종목·티커 검색"
            aria-label="주문 플레이어 또는 종목 검색"
          />
        </div>
      </div>

      <div className="admin-table-wrap admin-order-table-wrap" aria-live="polite">
        <table className="admin-table admin-order-table">
          <thead>
            <tr>
              <th>플레이어</th>
              <th>리그</th>
              <th>종목</th>
              <th>거래 형태</th>
              <th>수량</th>
              <th>주문가격</th>
              <th>레버리지</th>
              <th>대상 라운드</th>
              <th>상태</th>
              <th>접수 시각</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.length > 0 ? visibleOrders.map((order) => (
              <tr key={order.id}>
                <td><strong>{order.participantNickname}</strong></td>
                <td>{order.leagueName}</td>
                <td><span className="admin-order-stock"><strong>{order.stockName}</strong><small>{order.ticker}</small></span></td>
                <td>{sideLabels[order.side]}</td>
                <td>{formatPrice(order.requestedQuantity)}주</td>
                <td>{formatPrice(order.orderPrice)} RP</td>
                <td>{order.leveragePercent > 0 ? `${formatPrice(order.leveragePercent)}%` : '-'}</td>
                <td>{order.roundNumber}라운드</td>
                <td>
                  <span className={`admin-status ${order.status === 'locked' ? 'admin-status--warning' : 'admin-status--active'}`}>
                    {order.status === 'locked' ? '정산 잠금' : '접수 대기'}
                  </span>
                </td>
                <td>{formatKstDateTime(order.submittedAt)}</td>
              </tr>
            )) : (
              <tr><td className="admin-table-empty" colSpan={10}>조건에 맞는 현재 주문이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
