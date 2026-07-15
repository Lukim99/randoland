import { CheckCircle2, Clock3, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { formatKstDateTime, formatPrice, formatRp } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type { OrderSide, OrderSummary } from '../types/market'
import { ParticipantGate } from './ParticipantGate'

const orderTypeLabel: Record<OrderSide, string> = {
  buy: '매수',
  sell: '매도',
  short: '공매도',
  cover: '공매도 청산',
}

function orderTone(side: OrderSide) {
  return side === 'buy' || side === 'cover' ? 'buy' : 'sell'
}

function orderAmount(order: OrderSummary) {
  const price = order.executionPrice ?? order.orderPrice
  const quantity = order.executedQuantity ?? order.requestedQuantity
  return price * quantity
}

export function OrdersView() {
  const { myState, cancelOrder } = useMarket()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const orders = myState?.orders ?? []
  const waitingOrders = orders.filter((order) => order.status === 'pending' || order.status === 'locked')
  const executedOrders = orders.filter((order) => order.status === 'executed')
  const executedOrderCount = myState?.executedOrderCount ?? executedOrders.length

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
      <div className="feature-stack orders-view">
        {message && <p className="form-message" role="status">{message}</p>}

        <section className="panel live-section">
          <div className="section-heading section-heading--compact orders-heading">
            <div><span className="eyebrow">다음 정산</span><h2>체결 대기</h2></div>
            <span className="count-chip"><Clock3 size={14} /> {waitingOrders.length}건</span>
          </div>
          {waitingOrders.length > 0 ? (
            <div className="data-list order-history-list">
              {waitingOrders.map((order) => (
                <article className="data-row order-history-row" key={order.id}>
                  <span className={`side-badge ${orderTone(order.orderType)}`}>{orderTypeLabel[order.orderType]}</span>
                  <div className="data-row__identity">
                    <strong>{order.stockName}</strong>
                    <small>{order.ticker} · {order.roundNumber}라운드 · {formatKstDateTime(order.submittedAt)}</small>
                  </div>
                  <div><small>수량</small><strong>{formatPrice(order.requestedQuantity)}주</strong></div>
                  <div><small>주문가격</small><strong>{formatPrice(order.orderPrice)} RP</strong></div>
                  <div><small>주문금액</small><strong>{formatRp(orderAmount(order))}</strong></div>
                  {order.status === 'pending' && (
                    <button className="row-action-button" type="button" disabled={cancellingId === order.id} onClick={() => void handleCancel(order.id)}>
                      <RotateCcw size={14} /> {cancellingId === order.id ? '취소 중' : '취소'}
                    </button>
                  )}
                  {order.status === 'locked' && <strong className="order-status is-locked">정산 중</strong>}
                </article>
              ))}
            </div>
          ) : <p className="muted-empty">체결 대기 중인 주문이 없습니다.</p>}
        </section>

        <section className="panel live-section">
          <div className="section-heading section-heading--compact orders-heading">
            <div><span className="eyebrow">실제 체결 기준</span><h2>체결 기록</h2></div>
            <span className="count-chip"><CheckCircle2 size={14} /> {executedOrderCount}건</span>
          </div>
          {executedOrders.length > 0 ? (
            <div className="data-list order-history-list">
              {executedOrders.map((order) => (
                <article className="data-row order-history-row is-executed" key={order.id}>
                  <span className={`side-badge ${orderTone(order.orderType)}`}>{orderTypeLabel[order.orderType]}</span>
                  <div className="data-row__identity">
                    <strong>{order.stockName}</strong>
                    <small>{order.ticker} · {order.roundNumber}라운드 · {formatKstDateTime(order.executedAt ?? order.submittedAt)}</small>
                  </div>
                  <div><small>체결수량</small><strong>{formatPrice(order.executedQuantity ?? order.requestedQuantity)}주</strong></div>
                  <div><small>체결가</small><strong>{formatPrice(order.executionPrice ?? order.orderPrice)} RP</strong></div>
                  <div><small>체결금액</small><strong>{formatRp(orderAmount(order))}</strong></div>
                  <strong className="order-status is-executed">체결 완료</strong>
                </article>
              ))}
            </div>
          ) : <p className="muted-empty">체결된 주문이 없습니다.</p>}
        </section>
      </div>
    </ParticipantGate>
  )
}
