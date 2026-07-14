import { Clock3, Info, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRoundClock } from '../hooks/useRoundClock'
import { formatPrice, formatRp } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type { OrderSummary, OrderSide, StockSummary } from '../types/market'
import { SpriteIcon } from './SpriteIcon'

interface OrderPanelProps {
  stock: StockSummary
}

const orderStatusLabel: Record<OrderSummary['status'], string> = {
  pending: '체결 대기',
  locked: '정산 중',
  executed: '체결 완료',
  cancelled: '취소 완료',
  rejected: '주문 거절',
}

function displayOrderQuantity(order: OrderSummary, currentPrice: number) {
  if (order.executedQuantity) return order.executedQuantity
  if (order.quantity) return order.quantity
  if (!order.cashAmount) return 0
  return order.cashAmount / (order.executionPrice ?? currentPrice)
}

export function OrderPanel({ stock }: OrderPanelProps) {
  const { market, myState, placeOrder, cancelOrder } = useMarket()
  const [side, setSide] = useState<OrderSide>('buy')
  const [quantity, setQuantity] = useState(1)
  const [leverage, setLeverage] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { elapsed } = useRoundClock(market?.round?.locksAt)

  const participant = myState?.participant
  const currentRoundNumber = market?.round?.number
  const roundOrders = (myState?.orders ?? []).filter(
    (order) => order.roundNumber === currentRoundNumber,
  )
  const stockOrders = roundOrders.filter((order) => order.stockId === stock.id)
  const pendingOrders = stockOrders.filter(
    (order) => order.status === 'pending' || order.status === 'locked',
  )
  const sideOrderCount = roundOrders.filter(
    (order) => order.side === side && order.status !== 'rejected',
  ).length
  const position = myState?.positions.find((item) => item.stockId === stock.id)
  const isOwnStock = myState?.listing?.id === stock.id

  const estimate = useMemo(() => {
    const amount = stock.currentPrice * Math.max(0, quantity || 0)
    const borrowed = side === 'buy' ? Math.floor((amount * leverage) / (100 + leverage)) : 0
    return { amount, borrowed, own: amount - borrowed }
  }, [leverage, quantity, side, stock.currentPrice])

  const disabledReason = !myState?.joined
    ? '리그 참가 후 주문할 수 있습니다.'
    : isOwnStock
      ? '본인이 상장한 종목은 매매할 수 없습니다.'
      : market?.round?.status !== 'open' || elapsed
        ? '현재 주문 접수 시간이 아닙니다.'
        : null

  async function submitOrder() {
    setMessage(null)

    if (!Number.isInteger(quantity) || quantity < 1) {
      setMessage('주문 수량은 1주 이상의 정수로 입력해 주세요.')
      return
    }
    if (disabledReason) {
      setMessage(disabledReason)
      return
    }
    if (sideOrderCount >= 5) {
      setMessage(`${side === 'buy' ? '매수' : '매도'} 주문은 라운드당 최대 5건까지 접수할 수 있습니다.`)
      return
    }
    if (side === 'buy' && participant && estimate.own > participant.availableCash) {
      setMessage('주문 가능한 RP가 부족합니다.')
      return
    }
    if (side === 'sell' && quantity > (position?.quantity ?? 0)) {
      setMessage('주문 가능한 보유 수량이 부족합니다.')
      return
    }

    setSubmitting(true)
    try {
      await placeOrder(stock.id, side, quantity, side === 'buy' ? leverage : 0)
      setMessage(`${side === 'buy' ? '매수' : '매도'} 주문이 접수되었습니다. 체결 전까지 취소할 수 있습니다.`)
    } catch (orderError) {
      setMessage(orderError instanceof Error ? orderError.message : '주문 접수에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(orderId: string) {
    setCancellingId(orderId)
    setMessage(null)
    try {
      await cancelOrder(orderId)
      setMessage('대기 주문을 취소했습니다.')
    } catch (cancelError) {
      setMessage(cancelError instanceof Error ? cancelError.message : '주문 취소에 실패했습니다.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <aside className="panel order-panel" aria-label={`${stock.name} 주문`}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">주문서</span>
          <h2>주문 접수</h2>
        </div>
        <span className="order-count">{sideOrderCount}/5</span>
      </div>

      <div className="order-stock">
        <SpriteIcon kind="stock" index={stock.logoSpriteIndex} size="md" label={`${stock.name} 종목 이미지`} />
        <div>
          <strong>{stock.name}</strong>
          <small>{stock.ticker}</small>
        </div>
        <strong>{formatPrice(stock.currentPrice)}</strong>
      </div>

      <div className="segmented-control" aria-label="주문 종류">
        <button className={side === 'buy' ? 'is-active buy' : ''} type="button" onClick={() => setSide('buy')}>
          매수
        </button>
        <button className={side === 'sell' ? 'is-active sell' : ''} type="button" onClick={() => setSide('sell')}>
          매도
        </button>
      </div>

      <label className="field-label" htmlFor={`order-quantity-${stock.id}`}>
        <span>주문 수량</span>
        <small>{side === 'sell' ? `보유 ${position?.quantity ?? 0}주` : '1주 단위'}</small>
      </label>
      <div className="number-field">
        <input
          id={`order-quantity-${stock.id}`}
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
        />
        <span>주</span>
      </div>

      <div className={`leverage-field${side === 'sell' ? ' is-disabled' : ''}`}>
        <div className="field-label">
          <span>레버리지</span>
          <strong>{side === 'buy' ? leverage : 0}%</strong>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          step="5"
          value={side === 'buy' ? leverage : 0}
          onChange={(event) => setLeverage(Number(event.target.value))}
          disabled={side === 'sell'}
          aria-label="레버리지 비율"
        />
        <div className="range-labels">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
        </div>
      </div>

      <dl className="order-estimate">
        <div>
          <dt>예상 주문금액</dt>
          <dd>{formatRp(estimate.amount)}</dd>
        </div>
        {side === 'buy' && leverage > 0 && (
          <>
            <div>
              <dt>자기자금</dt>
              <dd>{formatRp(estimate.own)}</dd>
            </div>
            <div>
              <dt>레버리지 사용</dt>
              <dd className="accent-text">{formatRp(estimate.borrowed)}</dd>
            </div>
          </>
        )}
      </dl>

      <button
        className={`primary-order-button ${side}`}
        type="button"
        onClick={() => void submitOrder()}
        disabled={submitting || Boolean(disabledReason)}
      >
        {submitting ? '접수 중' : `${side === 'buy' ? '매수' : '매도'} 주문 접수`}
      </button>

      <p className="order-rule-note">
        <Clock3 size={15} aria-hidden="true" />
        다음 09:00에 변동 전 가격으로 일괄 체결됩니다.
      </p>
      {side === 'buy' && leverage > 0 && (
        <p className="order-fee-note">레버리지 포지션 매도 시 사용분의 평가액에서 5%가 차감됩니다.</p>
      )}
      {disabledReason && <p className="order-disabled-note">{disabledReason}</p>}

      {message && (
        <div className="inline-notice" role="status">
          <Info size={15} aria-hidden="true" />
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="알림 닫기">
            <X size={14} />
          </button>
        </div>
      )}

      {pendingOrders.length > 0 && (
        <div className="pending-orders">
          <div className="pending-orders__heading">
            <strong>이 종목 대기 주문</strong>
            <span>체결 전 취소 가능</span>
          </div>
          {pendingOrders.map((order) => (
            <div className="pending-order" key={order.id}>
              <span className={order.side === 'buy' ? 'is-up' : 'is-down'}>
                {order.side === 'buy' ? '매수' : '매도'} {displayOrderQuantity(order, stock.currentPrice)}주
              </span>
              <small>
                {orderStatusLabel[order.status]} · {order.side === 'buy' ? formatRp(order.cashAmount ?? 0) : formatRp((order.quantity ?? 0) * stock.currentPrice)}
              </small>
              {order.status === 'pending' && (
                <button
                  type="button"
                  aria-label={`${stock.name} 대기 주문 취소`}
                  disabled={cancellingId === order.id}
                  onClick={() => void handleCancel(order.id)}
                >
                  <RotateCcw size={14} /> {cancellingId === order.id ? '취소 중' : '취소'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
