import { Clock3, Info, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRoundClock } from '../hooks/useRoundClock'
import { formatPrice, formatRp, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type { OrderSide, OrderSummary, StockSummary } from '../types/market'
import { StockLogo } from './StockLogo'

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

const orderTypeLabel: Record<OrderSide, string> = {
  buy: '매수',
  sell: '매도',
  short: '공매도',
  cover: '청산',
}

function orderTone(side: OrderSide) {
  return side === 'buy' || side === 'cover' ? 'buy' : 'sell'
}

export function OrderPanel({ stock }: OrderPanelProps) {
  const { market, myState, getOrderCapacity, placeOrder, cancelOrder } = useMarket()
  const [side, setSide] = useState<OrderSide>('buy')
  const [quantity, setQuantity] = useState(1)
  const [leverage, setLeverage] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [capacityBusy, setCapacityBusy] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { elapsed } = useRoundClock(market?.round?.locksAt)

  const participant = myState?.participant
  const currentRoundNumber = market?.round?.number
  const stockOrders = (myState?.orders ?? []).filter(
    (order) => order.roundNumber === currentRoundNumber && order.stockId === stock.id,
  )
  const pendingOrders = stockOrders.filter(
    (order) => order.status === 'pending' || order.status === 'locked',
  )
  const position = myState?.positions.find((item) => item.stockId === stock.id)
  const shortPosition = myState?.shortPositions.find((item) => item.stockId === stock.id)
  const isOwnStock = myState?.listing?.id === stock.id
  const estimate = useMemo(() => {
    const amount = stock.currentPrice * Math.max(0, quantity || 0)
    const borrowed = side === 'buy' ? Math.floor((amount * leverage) / (100 + leverage)) : 0
    const shortProfit = side === 'cover' && shortPosition
      ? (shortPosition.averageEntryPrice - stock.currentPrice) * Math.max(0, quantity || 0)
      : 0
    return { amount, borrowed, own: amount - borrowed, shortProfit }
  }, [leverage, quantity, shortPosition, side, stock.currentPrice])

  const disabledReason = !myState?.joined
    ? '리그 참가 후 주문할 수 있습니다.'
    : isOwnStock
      ? '본인이 상장한 종목은 거래할 수 없습니다.'
      : market?.round?.status !== 'open' || elapsed
        ? '현재 주문 접수 시간이 아닙니다.'
        : participant && participant.receivableRp > 0 && (side === 'buy' || side === 'short')
          ? '미수 RP를 상환하기 전에는 신규 매수와 공매도를 할 수 없습니다.'
          : side === 'short' && (position?.quantity ?? 0) > 0
            ? '보유 주식을 전량 매도한 뒤 공매도할 수 있습니다.'
            : side === 'buy' && (shortPosition?.quantity ?? 0) > 0
              ? '공매도 포지션을 전량 청산한 뒤 매수할 수 있습니다.'
              : side === 'sell' && (position?.quantity ?? 0) <= 0
                ? '매도할 보유 수량이 없습니다.'
                : side === 'cover' && (shortPosition?.quantity ?? 0) <= 0
                  ? '청산할 공매도 수량이 없습니다.'
                  : null

  function selectSide(nextSide: OrderSide) {
    setSide(nextSide)
    setLeverage(nextSide === 'buy' ? leverage : 0)
    setMessage(null)
  }

  async function fillMaximum() {
    setCapacityBusy(true)
    setMessage(null)
    try {
      const capacity = await getOrderCapacity(stock.id, side, side === 'buy' ? leverage : 0)
      const maximum = Math.max(0, Math.floor(capacity.maxQuantity))
      setQuantity(maximum)
      if (maximum < 1) setMessage('현재 주문 가능한 수량이 없습니다.')
    } catch (capacityError) {
      setMessage(capacityError instanceof Error ? capacityError.message : '최대 주문 수량을 계산하지 못했습니다.')
    } finally {
      setCapacityBusy(false)
    }
  }

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
    if (side === 'buy' && participant && estimate.own > participant.availableCash) {
      setMessage('주문 가능한 RP가 부족합니다.')
      return
    }
    if (side === 'sell' && quantity > (position?.quantity ?? 0)) {
      setMessage('주문 가능한 보유 수량이 부족합니다.')
      return
    }
    if (side === 'cover' && quantity > (shortPosition?.quantity ?? 0)) {
      setMessage('청산 가능한 공매도 수량이 부족합니다.')
      return
    }

    setSubmitting(true)
    try {
      await placeOrder(stock.id, side, quantity, side === 'buy' ? leverage : 0)
      setMessage(`${orderTypeLabel[side]} 주문이 접수되었습니다. 체결 전까지 취소할 수 있습니다.`)
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
          <h2>주문</h2>
        </div>
      </div>

      <div className="order-stock">
        <StockLogo src={stock.logoImageUrl} spriteIndex={stock.logoSpriteIndex} size="md" label={`${stock.name} 종목 이미지`} />
        <div>
          <strong>{stock.name}</strong>
          <small>{stock.ticker}</small>
        </div>
        <strong>{formatPrice(stock.currentPrice)}</strong>
      </div>

      <div className="order-type-control" role="group" aria-label="주문 종류">
        {(Object.keys(orderTypeLabel) as OrderSide[]).map((orderType) => (
          <button
            className={side === orderType ? `is-active ${orderTone(orderType)}` : ''}
            type="button"
            aria-pressed={side === orderType}
            onClick={() => selectSide(orderType)}
            key={orderType}
          >
            {orderTypeLabel[orderType]}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor={`order-quantity-${stock.id}`}>
        <span>주문 수량</span>
        <small>
          {side === 'sell'
            ? `보유 ${position?.quantity ?? 0}주`
            : side === 'cover'
              ? `공매도 ${shortPosition?.quantity ?? 0}주`
              : '1주 단위'}
        </small>
      </label>
      <div className="number-field number-field--with-action">
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
        <button type="button" onClick={() => void fillMaximum()} disabled={capacityBusy || Boolean(disabledReason)}>
          {capacityBusy ? '계산 중' : '최대'}
        </button>
      </div>

      {side === 'buy' && (
        <div className="leverage-field">
          <div className="field-label">
            <span>레버리지</span>
            <strong>{leverage}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={leverage}
            onChange={(event) => setLeverage(Number(event.target.value))}
            aria-label="레버리지 비율"
          />
          <div className="range-labels"><span>0%</span><span>25%</span><span>50%</span></div>
        </div>
      )}

      <dl className="order-estimate">
        <div><dt>주문금액</dt><dd>{formatRp(estimate.amount)}</dd></div>
        {side === 'buy' && leverage > 0 && (
          <>
            <div><dt>자기자금</dt><dd>{formatRp(estimate.own)}</dd></div>
            <div><dt>레버리지</dt><dd className="accent-text">{formatRp(estimate.borrowed)}</dd></div>
          </>
        )}
        {side === 'cover' && shortPosition && (
          <div>
            <dt>예상 손익</dt>
            <dd className={movementClass(estimate.shortProfit)}>{formatRp(estimate.shortProfit)}</dd>
          </div>
        )}
      </dl>

      <button
        className={`primary-order-button ${orderTone(side)}`}
        type="button"
        onClick={() => void submitOrder()}
        disabled={submitting || Boolean(disabledReason)}
      >
        {submitting ? '접수 중' : `${orderTypeLabel[side]} 주문`}
      </button>

      <p className="order-rule-note"><Clock3 size={15} aria-hidden="true" />주문 시점 가격으로 다음 09:00에 체결됩니다.</p>
      {side === 'buy' && leverage > 0 && (
        <p className="order-fee-note">레버리지 사용분의 매도 평가액에서 5%가 차감됩니다.</p>
      )}
      {side === 'short' && <p className="order-fee-note">공매도 판매대금은 예수금에 포함되지 않습니다.</p>}
      {disabledReason && <p className="order-disabled-note">{disabledReason}</p>}

      {message && (
        <div className="inline-notice" role="status">
          <Info size={15} aria-hidden="true" />
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="알림 닫기"><X size={14} /></button>
        </div>
      )}

      {pendingOrders.length > 0 && (
        <div className="pending-orders">
          <div className="pending-orders__heading"><strong>체결 대기</strong><span>체결 전 취소 가능</span></div>
          {pendingOrders.map((order) => (
            <div className="pending-order" key={order.id}>
              <span className={orderTone(order.orderType) === 'buy' ? 'is-up' : 'is-down'}>
                {orderTypeLabel[order.orderType]} {formatPrice(order.requestedQuantity)}주
              </span>
              <small>{orderStatusLabel[order.status]} · {formatRp(order.requestedQuantity * order.orderPrice)}</small>
              {order.status === 'pending' && (
                <button
                  type="button"
                  aria-label={`${stock.name} ${orderTypeLabel[order.orderType]} 대기 주문 취소`}
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
