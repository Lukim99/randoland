import { RefreshCw, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatPercent, formatPrice, formatQuantity, formatRp, movementClass } from '../lib/format'
import { loadAdminStockPositions } from '../services/admin'
import type { AdminStockPosition } from '../types/admin'

export function AdminStockPositionsDialog({ stock, onClose }: {
  stock: { id: string; name: string }
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [positions, setPositions] = useState<AdminStockPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog?.showModal()
    return () => {
      dialog?.close()
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void loadAdminStockPositions(stock.id, controller.signal).then((data) => {
      if (!controller.signal.aborted) setPositions(data)
    }).catch((nextError: unknown) => {
      if (!controller.signal.aborted) setError(nextError instanceof Error ? nextError.message : '포지션을 불러오지 못했습니다.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [stock.id, revision])

  return createPortal(
    <dialog ref={dialogRef} className="admin-positions-dialog" aria-labelledby={titleId} onCancel={onClose}>
      <header>
        <div><h2 id={titleId}>{stock.name} 보유·공매도</h2><p>현재 포지션이 있는 플레이어</p></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="포지션 조회 닫기"><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="admin-positions-dialog__body" aria-busy={loading}>
        {loading ? <p className="admin-empty-copy" role="status">현재 포지션을 불러오는 중입니다.</p> : error ? <p className="admin-feedback is-error" role="alert">{error}</p> : (
          <>
            <p className="admin-positions-summary">일반 보유 {positions.filter((position) => position.positionType === 'long').length}명 · 공매도 {positions.filter((position) => position.positionType === 'short').length}명</p>
            <div className="admin-table-wrap">
              <table className="admin-table admin-position-table admin-responsive-table">
                <thead><tr><th>플레이어</th><th>구분</th><th>수량</th><th>평균단가</th><th>현재가</th><th>평가액·상환액</th><th>평가손익</th><th>수익률</th></tr></thead>
                <tbody>
                  {positions.length > 0 ? positions.map((position) => (
                    <tr key={`${position.participantId}:${position.positionType}`}>
                      <td data-label="플레이어"><strong>{position.nickname}</strong>{position.isSpectator && <span className="admin-status admin-status--warning">관전</span>}</td>
                      <td data-label="구분"><span className={`admin-position-badge is-${position.positionType}`}>{position.positionType === 'short' ? '공매도' : '일반 보유'}</span></td>
                      <td data-label="수량">{formatQuantity(position.quantity)}주</td>
                      <td data-label={position.positionType === 'short' ? '평균 진입가' : '평균단가'}>{formatPrice(position.averagePrice)} RP</td>
                      <td data-label="현재가">{formatPrice(position.currentPrice)} RP</td>
                      <td data-label={position.positionType === 'short' ? '상환액' : '평가액'}>{formatRp(position.marketValue)}</td>
                      <td data-label="평가손익" className={movementClass(position.evaluationProfit)}>{position.evaluationProfit > 0 ? '+' : ''}{formatRp(position.evaluationProfit)}</td>
                      <td data-label="수익률" className={movementClass(position.returnPercent)}>{formatPercent(position.returnPercent)}</td>
                    </tr>
                  )) : <tr><td className="admin-table-empty" colSpan={8}>현재 보유하거나 공매도 중인 플레이어가 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
            {positions.some((position) => position.positionType === 'short') && <p className="admin-form__hint">공매도의 평가액·상환액은 현재가 기준 청산 금액입니다.</p>}
          </>
        )}
      </div>
      <footer><button className="secondary-button" type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={14} aria-hidden="true" /> 새로고침</button></footer>
    </dialog>, document.body,
  )
}
