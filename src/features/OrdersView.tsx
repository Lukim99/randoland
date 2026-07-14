import { Clock3, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { formatKstDateTime, formatPrice, formatRp } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type { OrderStatus, OrderSummary } from '../types/market'
import { ParticipantGate } from './ParticipantGate'

const statusLabels: Record<OrderStatus, string> = {
  pending: '체결 대기',
  locked: '정산 중',
  executed: '체결 완료',
  cancelled: '취소 완료',
  rejected: '주문 거절',
}

type Filter = 'all' | 'waiting' | 'done'

function orderAmount(order: OrderSummary) {
  if (order.cashAmount) return order.cashAmount
  if (order.executionPrice && order.quantity) return order.executionPrice * order.quantity
  return null
}

export function OrdersView() {
  const { market, myState, cancelOrder } = useMarket()
  const [filter, setFilter] = useState<Filter>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const orders = myState?.orders ?? []
  const visibleOrders = orders.filter((order) => {
    if (filter === 'waiting') return order.status === 'pending' || order.status === 'locked'
    if (filter === 'done') return order.status === 'executed'
    return true
  })
  const currentRoundOrders = orders.filter(
    (order) => order.roundNumber === market?.round?.number && order.status !== 'rejected',
  )

  async function handleCancel(orderId: string) {
    setCancellingId(orderId)
    setMessage(null)
    try {
      await cancelOrder(orderId)
      setMessage('대기 주문을 취소했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '주문 취소에 실패했습니다.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <ParticipantGate>
      <div className="feature-stack">
        <section className="panel live-section order-round-summary">
          <div><Clock3 size={18} /><span><small>현재 라운드 주문</small><strong>{currentRoundOrders.length}건</strong></span></div>
          <div><small>매수</small><strong>{currentRoundOrders.filter((order) => order.side === 'buy').length}/5</strong></div>
          <div><small>매도</small><strong>{currentRoundOrders.filter((order) => order.side === 'sell').length}/5</strong></div>
          <p>취소한 주문도 악용 방지를 위해 라운드별 접수 횟수에 포함됩니다.</p>
        </section>

        <section className="panel live-section">
          <div className="section-heading section-heading--compact orders-heading">
            <div><span className="eyebrow">전체 주문 기록</span><h2>주문 내역</h2></div>
            <div className="filter-tabs" aria-label="주문 상태 필터">
              <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>전체</button>
              <button type="button" className={filter === 'waiting' ? 'is-active' : ''} onClick={() => setFilter('waiting')}>대기</button>
              <button type="button" className={filter === 'done' ? 'is-active' : ''} onClick={() => setFilter('done')}>체결</button>
            </div>
          </div>
          {message && <p className="form-message" role="status">{message}</p>}
          {visibleOrders.length > 0 ? (
            <div className="data-list order-history-list">
              {visibleOrders.map((order) => (
                <article className="data-row order-history-row" key={order.id}>
                  <span className={`side-badge ${order.side}`}>{order.side === 'buy' ? '매수' : '매도'}</span>
                  <div className="data-row__identity">
                    <strong>{order.stockName}</strong>
                    <small>{order.ticker} · {order.roundNumber}라운드 · {formatKstDateTime(order.submittedAt)}</small>
                  </div>
                  <div><small>수량</small><strong>{order.executedQuantity ?? order.quantity ?? '-'}주</strong></div>
                  <div><small>{order.status === 'executed' ? '체결가' : '주문금액'}</small><strong>{order.executionPrice ? `${formatPrice(order.executionPrice)} RP` : orderAmount(order) ? formatRp(orderAmount(order) ?? 0) : '-'}</strong></div>
                  <div><small>상태</small><strong className={`order-status is-${order.status}`}>{statusLabels[order.status]}</strong></div>
                  {order.status === 'pending' && (
                    <button className="row-action-button" type="button" disabled={cancellingId === order.id} onClick={() => void handleCancel(order.id)}>
                      <RotateCcw size={14} /> {cancellingId === order.id ? '취소 중' : '취소'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : <p className="muted-empty">조건에 맞는 주문 내역이 없습니다.</p>}
        </section>
      </div>
    </ParticipantGate>
  )
}
