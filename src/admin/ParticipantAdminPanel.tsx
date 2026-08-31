import { Coins, Search, ShieldBan, ShieldCheck, TicketCheck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import {
  adjustAdminParticipantAsset,
  createAdminRequestKey,
  disqualifyAdminParticipant,
  revokeAdminBan,
} from '../services/admin'
import type {
  AdminActionRunner,
  AdminLeague,
  AdminParticipant,
  AdminParticipantAssetDirection,
  AdminParticipantAssetType,
  AdminStock,
} from '../types/admin'
import { formatPercent, formatPrice, formatRp, movementClass } from '../lib/format'

interface ParticipantAdminPanelProps {
  leagues: AdminLeague[]
  participants: AdminParticipant[]
  stocks: AdminStock[]
  busy: boolean
  onRun: AdminActionRunner
}

const assetLabels: Record<AdminParticipantAssetType, string> = {
  rp: 'RP',
  attendance_token: '출석토큰',
  stock: '상장주식',
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 8 }).format(value)
}

export function ParticipantAdminPanel({
  leagues,
  participants,
  stocks,
  busy,
  onRun,
}: ParticipantAdminPanelProps) {
  const [query, setQuery] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [sanctionReason, setSanctionReason] = useState('')
  const [banFuture, setBanFuture] = useState(true)
  const [assetType, setAssetType] = useState<AdminParticipantAssetType>('rp')
  const [direction, setDirection] = useState<AdminParticipantAssetDirection>('grant')
  const [amount, setAmount] = useState('')
  const [stockId, setStockId] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjustmentRequestKey, setAdjustmentRequestKey] = useState<string | null>(null)

  const selectedParticipantId = participants.some(({ id }) => id === participantId)
    ? participantId
    : participants[0]?.id ?? ''
  const selectedParticipant = participants.find(({ id }) => id === selectedParticipantId)
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const visibleParticipants = participants.filter((participant) => (
    !normalizedQuery
    || participant.nickname.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
  ))
  const leagueNameById = useMemo(
    () => new Map(leagues.map((league) => [league.id, league.name])),
    [leagues],
  )

  const adjustableStocks = stocks.filter((stock) => (
    stock.leagueId === selectedParticipant?.leagueId
    && (stock.status === 'active' || stock.status === 'halted')
    && (direction === 'revoke'
      ? selectedParticipant?.holdings.some((holding) => (
        holding.stockId === stock.id && holding.recoverableQuantity > 0
      ))
      : stock.ownerParticipantId !== selectedParticipant?.id)
  ))
  const selectedStockId = adjustableStocks.some(({ id }) => id === stockId)
    ? stockId
    : adjustableStocks[0]?.id ?? ''
  const selectedHolding = selectedParticipant?.holdings.find(
    (holding) => holding.stockId === selectedStockId,
  )

  function resetAdjustmentRequest() {
    setAdjustmentRequestKey(null)
  }

  function selectParticipant(nextParticipantId: string) {
    setParticipantId(nextParticipantId)
    setStockId('')
    resetAdjustmentRequest()
  }

  async function handleAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedParticipant) return

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return

    const assetLabel = assetType === 'stock'
      ? stocks.find((stock) => stock.id === selectedStockId)?.name ?? '상장주식'
      : assetLabels[assetType]
    const directionLabel = direction === 'grant' ? '지급' : '회수'
    const displayAmount = assetType === 'rp'
      ? formatRp(numericAmount)
      : `${formatQuantity(numericAmount)}${assetType === 'attendance_token' ? '개' : '주'}`

    if (direction === 'revoke' && !window.confirm(
      `${selectedParticipant.nickname} 참가자에게서 ${assetLabel} ${displayAmount}를 회수하시겠습니까?`,
    )) return

    const requestKey = adjustmentRequestKey ?? createAdminRequestKey()
    setAdjustmentRequestKey(requestKey)
    const completed = await onRun(
      () => adjustAdminParticipantAsset({
        participantId: selectedParticipant.id,
        assetType,
        direction,
        amount: numericAmount,
        stockId: assetType === 'stock' ? selectedStockId : null,
        reason: adjustmentReason,
        requestKey,
      }),
      `${selectedParticipant.nickname} 참가자에게 ${assetLabel} ${displayAmount} ${directionLabel}을 완료했습니다.`,
    )

    if (completed) {
      setAmount('')
      setAdjustmentReason('')
      setAdjustmentRequestKey(null)
    }
  }

  async function handleDisqualify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedParticipant) return
    if (!window.confirm(`${selectedParticipant.nickname} 참가자를 제재하시겠습니까?`)) return
    const completed = await onRun(
      () => disqualifyAdminParticipant(selectedParticipant.id, sanctionReason, banFuture),
      `${selectedParticipant.nickname} 참가자를 제재했습니다.`,
    )
    if (completed) setSanctionReason('')
  }

  async function handleRevokeBan() {
    if (!selectedParticipant?.activeBan) return
    const completed = await onRun(
      () => revokeAdminBan(selectedParticipant.userId, sanctionReason),
      `${selectedParticipant.nickname} 계정의 이후 리그 참가 제한을 해제했습니다.`,
    )
    if (completed) setSanctionReason('')
  }

  const amountStep = assetType === 'stock' ? '0.00000001' : '1'
  const revokeLimit = assetType === 'attendance_token'
      ? selectedParticipant?.attendanceTokens
      : assetType === 'stock'
        ? selectedHolding?.recoverableQuantity
        : undefined

  return (
    <section className="admin-panel admin-panel--participant">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><Coins size={19} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">PARTICIPANT</span>
          <h2>리그 참가 플레이어 관리</h2>
          <p>총 보유 자산을 확인하고 이벤트 자산을 지급하거나 회수합니다.</p>
        </div>
      </header>

      <div className="admin-search">
        <Search size={16} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="닉네임 검색" aria-label="참가자 닉네임 검색" />
      </div>

      <div className="admin-table-wrap admin-participant-table-wrap">
        <table className="admin-table admin-participant-table">
          <thead><tr><th>참가자</th><th>리그</th><th>총 보유 자산</th><th>보유 RP</th><th>토큰</th><th>상태</th></tr></thead>
          <tbody>{visibleParticipants.map((participant) => (
            <tr className={participant.id === selectedParticipantId ? 'is-selected' : undefined} key={participant.id}>
              <td>
                <button className="admin-participant-select" type="button" onClick={() => selectParticipant(participant.id)}>
                  {participant.nickname}
                </button>
              </td>
              <td>{leagueNameById.get(participant.leagueId) ?? '알 수 없음'}</td>
              <td><strong>{formatRp(participant.netWorth)}</strong></td>
              <td>{formatRp(participant.cashBalance)}</td>
              <td>{formatPrice(participant.attendanceTokens)}개</td>
              <td><span className={`admin-status${participant.disqualifiedAt ? ' admin-status--archived' : participant.activeBan ? ' admin-status--warning' : ' admin-status--active'}`}>{participant.disqualifiedAt ? '리그 제재' : participant.activeBan ? '이후 참가 제한' : '정상'}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selectedParticipant && (
        <>
          <section className="admin-participant-summary" aria-label={`${selectedParticipant.nickname} 자산 상세`}>
            <div><span>순자산</span><strong>{formatRp(selectedParticipant.netWorth)}</strong></div>
            <div><span>사용 가능 RP</span><strong>{formatRp(selectedParticipant.availableCash)}</strong></div>
            <div><span>주식 평가액</span><strong>{formatRp(selectedParticipant.longMarketValue)}</strong></div>
            <div><span>공매도 상환액</span><strong>{formatRp(selectedParticipant.shortExposure)}</strong></div>
            <div><span>미수 RP</span><strong>{formatRp(selectedParticipant.receivableRp)}</strong></div>
            <div><span>출석토큰</span><strong>{formatPrice(selectedParticipant.attendanceTokens)}개</strong></div>
          </section>

          <section className="admin-participant-holdings" aria-labelledby="admin-participant-holdings-title">
            <header>
              <div>
                <span className="eyebrow">HOLDINGS</span>
                <h3 id="admin-participant-holdings-title">{selectedParticipant.nickname} 보유 주식</h3>
              </div>
              <span className="count-chip">{selectedParticipant.holdings.length}종목</span>
            </header>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>종목</th><th>보유수량</th><th>평균단가</th><th>현재가</th><th>평가금액</th><th>평가손익</th><th>수익률</th></tr></thead>
                <tbody>
                  {selectedParticipant.holdings.length > 0 ? selectedParticipant.holdings.map((holding) => (
                    <tr key={holding.stockId}>
                      <td><span className="admin-order-stock"><strong>{holding.stockName}</strong><small>{holding.ticker}</small></span></td>
                      <td>{formatQuantity(holding.quantity)}주</td>
                      <td>{formatPrice(holding.averagePrice)} RP</td>
                      <td>{formatPrice(holding.currentPrice)} RP</td>
                      <td>{formatRp(holding.marketValue)}</td>
                      <td className={movementClass(holding.evaluationProfit)}>{formatRp(holding.evaluationProfit)}</td>
                      <td className={movementClass(holding.returnPercent)}>{formatPercent(holding.returnPercent)}</td>
                    </tr>
                  )) : (
                    <tr><td className="admin-table-empty" colSpan={7}>현재 보유 중인 주식이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <form className="admin-form admin-participant-adjustment" onSubmit={(event) => void handleAdjustment(event)}>
        <h3><TicketCheck size={16} aria-hidden="true" /> 자산 지급·회수</h3>
        <div className="admin-form__columns">
          <label>
            <span>대상 플레이어</span>
            <select value={selectedParticipantId} onChange={(event) => selectParticipant(event.target.value)} disabled={participants.length === 0 || busy}>
              {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.nickname} · {leagueNameById.get(participant.leagueId)}{participant.disqualifiedAt ? ' · 제재됨' : ''}</option>)}
            </select>
          </label>
          <label>
            <span>작업</span>
            <select value={direction} onChange={(event) => { setDirection(event.target.value as AdminParticipantAssetDirection); setStockId(''); resetAdjustmentRequest() }} disabled={busy}>
              <option value="grant">지급</option>
              <option value="revoke">회수</option>
            </select>
          </label>
          <label>
            <span>자산 종류</span>
            <select value={assetType} onChange={(event) => { setAssetType(event.target.value as AdminParticipantAssetType); setStockId(''); resetAdjustmentRequest() }} disabled={busy}>
              <option value="rp">RP</option>
              <option value="attendance_token">출석토큰</option>
              <option value="stock">상장주식</option>
            </select>
          </label>
          {assetType === 'stock' && (
            <label>
              <span>종목</span>
              <select value={selectedStockId} onChange={(event) => { setStockId(event.target.value); resetAdjustmentRequest() }} disabled={busy || adjustableStocks.length === 0} required>
                {adjustableStocks.length === 0 && <option value="">선택 가능한 종목 없음</option>}
                {adjustableStocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.ticker} · {stock.name}{direction === 'revoke' ? ` · 보유 ${formatQuantity(selectedParticipant?.holdings.find((holding) => holding.stockId === stock.id)?.quantity ?? 0)}주` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{assetType === 'stock' ? '수량' : '금액·개수'}</span>
            <input
              type="number"
              min={amountStep}
              max={direction === 'revoke' && assetType !== 'rp' ? revokeLimit : undefined}
              step={amountStep}
              value={amount}
              onChange={(event) => { setAmount(event.target.value); resetAdjustmentRequest() }}
              disabled={busy}
              required
            />
          </label>
        </div>
        {direction === 'revoke' && (
          <p className="admin-form__hint">
            {assetType === 'rp'
              ? '보유 RP를 초과한 회수분은 미수 RP로 기록되며, 이후 신규 매수·공매도가 제한됩니다.'
              : `회수 가능: ${formatQuantity(revokeLimit ?? 0)}${assetType === 'attendance_token' ? '개' : '주'}${assetType === 'stock' ? ' · 레버리지 수량은 제외됩니다.' : ''}`}
          </p>
        )}
        <label>
          <span>운영 사유</span>
          <textarea value={adjustmentReason} onChange={(event) => { setAdjustmentReason(event.target.value); resetAdjustmentRequest() }} minLength={5} maxLength={500} rows={3} placeholder="예: 민생지원금 이벤트 지급" disabled={busy} required />
        </label>
        <button className={direction === 'grant' ? 'primary-button' : 'danger-button'} type="submit" disabled={busy || !selectedParticipant || Boolean(selectedParticipant.disqualifiedAt) || (assetType === 'stock' && !selectedStockId)}>
          {assetLabels[assetType]} {direction === 'grant' ? '지급' : '회수'}
        </button>
      </form>

      <form className="admin-form admin-form--danger" onSubmit={(event) => void handleDisqualify(event)}>
        <h3><ShieldBan size={16} aria-hidden="true" /> 플레이어 제재</h3>
        <label><span>제재 사유</span><textarea value={sanctionReason} onChange={(event) => setSanctionReason(event.target.value)} minLength={5} maxLength={500} rows={3} required /></label>
        <label className="admin-check"><input type="checkbox" checked={banFuture} onChange={(event) => setBanFuture(event.target.checked)} /><span>이후 리그 참가도 제한</span></label>
        <div className="admin-form__actions">
          <button className="danger-button" type="submit" disabled={busy || !selectedParticipantId || Boolean(selectedParticipant?.disqualifiedAt)}>참가자 제재</button>
          {selectedParticipant?.activeBan && (
            <button className="secondary-button" type="button" onClick={() => void handleRevokeBan()} disabled={busy || sanctionReason.trim().length < 5}>
              <ShieldCheck size={15} aria-hidden="true" /> 이후 참가 제한 해제
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
