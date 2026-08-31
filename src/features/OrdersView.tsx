import { CheckCircle2 } from 'lucide-react'
import { formatKstDateTime, formatPrice, formatRp } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type { OrderSide, OrderSummary } from '../types/market'
import { ParticipantGate } from './ParticipantGate'

const orderTypeLabel: Record<OrderSide, string> = {
  buy: '매수',
  sell: '매도',
  short: '공매도',
  cover: '청산',
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
  const { myState } = useMarket()
  const orders = myState?.orders ?? []
  const executedOrders = orders.filter((order) => order.status === 'executed')
  const executedOrderCount = myState?.executedOrderCount ?? executedOrders.length

  return (
    <ParticipantGate>
      <div className="feature-stack orders-view">
        <section className="panel live-section">
          <div className="section-heading section-heading--compact orders-heading">
            <div><h2>체결 기록</h2></div>
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
