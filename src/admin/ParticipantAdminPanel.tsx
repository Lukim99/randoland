import { Coins, Eye, PenLine, ShieldBan, ShieldCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import {
  disqualifyAdminParticipant,
  revokeAdminBan,
  setAdminParticipantSpectator,
  updateAdminParticipantNickname,
} from '../services/admin'
import type {
  AdminActionRunner,
  AdminLeague,
  AdminParticipant,
  AdminStock,
} from '../types/admin'
import { BulkAssetAdjustment } from './BulkAssetAdjustment'
import { formatPercent, formatPrice, formatRp, movementClass } from '../lib/format'

interface ParticipantAdminPanelProps {
  leagues: AdminLeague[]
  participants: AdminParticipant[]
  stocks: AdminStock[]
  busy: boolean
  onRun: AdminActionRunner
  onInspectStock: (stock: { id: string; name: string }) => void
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
  onInspectStock,
}: ParticipantAdminPanelProps) {
  const [participantId, setParticipantId] = useState('')
  const [nickname, setNickname] = useState('')
  const [sanctionReason, setSanctionReason] = useState('')
  const [banFuture, setBanFuture] = useState(true)

  const selectedParticipantId = participants.some(({ id }) => id === participantId)
    ? participantId
    : participants[0]?.id ?? ''
  const selectedParticipant = participants.find(({ id }) => id === selectedParticipantId)
  const positions = selectedParticipant ? [
    ...selectedParticipant.holdings.map((holding) => ({ ...holding, positionType: 'long' as const })),
    ...selectedParticipant.shortHoldings.map((holding) => ({ ...holding, positionType: 'short' as const })),
  ] : []
  const normalizedNickname = nickname.trim().normalize('NFC')
  useEffect(() => {
    setNickname(selectedParticipant?.nickname ?? '')
  }, [selectedParticipant?.id, selectedParticipant?.nickname])

  function selectParticipant(id: string) { setParticipantId(id) }

  async function handleNicknameChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedParticipant) return

    await onRun(
      () => updateAdminParticipantNickname(selectedParticipant.id, normalizedNickname),
      `${selectedParticipant.nickname} 참가자의 닉네임을 "${normalizedNickname}"로 변경했습니다.`,
    )
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

  async function handleSpectatorChange() {
    if (!selectedParticipant) return
    const nextIsSpectator = !selectedParticipant.isSpectator
    const actionLabel = nextIsSpectator ? '관전자로 설정' : '일반 참가자로 전환'
    if (!window.confirm(
      `${selectedParticipant.nickname} 참가자를 ${actionLabel}하시겠습니까?\n거래와 자산 등 다른 기능은 유지되며 주간 순위에서만 제외됩니다.`,
    )) return

    await onRun(
      () => setAdminParticipantSpectator(selectedParticipant.id, nextIsSpectator),
      `${selectedParticipant.nickname} 참가자를 ${actionLabel}했습니다.`,
    )
  }

  async function handleRevokeBan() {
    if (!selectedParticipant?.activeBan) return
    const completed = await onRun(
      () => revokeAdminBan(selectedParticipant.userId, sanctionReason),
      `${selectedParticipant.nickname} 계정의 이후 리그 참가 제한을 해제했습니다.`,
    )
    if (completed) setSanctionReason('')
  }

  return (
    <section className="admin-panel admin-panel--participant">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><Coins size={19} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">PARTICIPANT</span>
          <h2>리그 참가 플레이어 관리</h2>
          <p>닉네임, 관전자 여부와 총 보유 자산을 관리하고 이벤트 자산을 지급하거나 회수합니다.</p>
        </div>
      </header>

      <BulkAssetAdjustment leagues={leagues} participants={participants} stocks={stocks} busy={busy} onRun={onRun} onSelectParticipant={selectParticipant} />

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

          <section className="admin-form admin-participant-spectator" aria-labelledby="admin-participant-spectator-title">
            <h3 id="admin-participant-spectator-title"><Eye size={16} aria-hidden="true" /> 관전자 설정</h3>
            <p className="admin-form__hint">
              관전자는 거래, 자산, 토론 등 다른 기능은 동일하게 이용하며 공개 주간 순위에서만 제외됩니다.
            </p>
            <button
              className={selectedParticipant.isSpectator ? 'secondary-button' : 'primary-button'}
              type="button"
              onClick={() => void handleSpectatorChange()}
              disabled={busy}
            >
              {selectedParticipant.isSpectator ? '일반 참가자로 전환' : '관전자로 설정'}
            </button>
          </section>

          <form className="admin-form admin-participant-nickname" onSubmit={(event) => void handleNicknameChange(event)}>
            <h3><PenLine size={16} aria-hidden="true" /> 닉네임 변경</h3>
            <div className="admin-form__columns">
              <label>
                <span>현재 닉네임</span>
                <input type="text" value={selectedParticipant.nickname} disabled />
              </label>
              <label>
                <span>새 닉네임</span>
                <input
                  type="text"
                  value={nickname}
                  maxLength={16}
                  pattern="(?:[가-힣]{1,8}|[A-Za-z0-9]{1,16})"
                  title="한글 1~8자 또는 영문·숫자 1~16자로 입력해 주세요."
                  autoComplete="off"
                  onChange={(event) => setNickname(event.target.value)}
                  disabled={busy}
                  required
                />
              </label>
            </div>
            <p className="admin-form__hint">한글 8자 이하 또는 영문·숫자 16자 이하 · 같은 리그에서는 중복 사용할 수 없습니다.</p>
            <button
              className="primary-button"
              type="submit"
              disabled={busy || normalizedNickname.length === 0 || normalizedNickname === selectedParticipant.nickname}
            >
              닉네임 변경
            </button>
          </form>

          <section className="admin-participant-holdings" aria-labelledby="admin-participant-holdings-title">
            <header>
              <div>
                <span className="eyebrow">HOLDINGS</span>
                <h3 id="admin-participant-holdings-title">{selectedParticipant.nickname} 보유·공매도 종목</h3>
              </div>
              <span className="count-chip">{positions.length}종목</span>
            </header>
            <div className="admin-table-wrap">
              <table className="admin-table admin-position-table admin-responsive-table">
                <thead><tr><th>종목</th><th>구분</th><th>수량</th><th>평균단가</th><th>현재가</th><th>평가액·상환액</th><th>평가손익</th><th>수익률</th></tr></thead>
                <tbody>
                  {positions.length > 0 ? positions.map((holding) => (
                    <tr key={`${holding.stockId}:${holding.positionType}`}>
                      <td data-label="종목"><button className="admin-participant-select admin-order-stock" type="button" onClick={() => onInspectStock({ id: holding.stockId, name: holding.stockName })} aria-label={`${holding.stockName} 보유·공매도 플레이어 조회`}><strong>{holding.stockName}</strong><small>{holding.ticker}</small></button></td>
                      <td data-label="구분"><span className={`admin-position-badge is-${holding.positionType}`}>{holding.positionType === 'short' ? '공매도' : '일반 보유'}</span></td>
                      <td data-label="수량">{formatQuantity(holding.quantity)}주</td>
                      <td data-label={holding.positionType === 'short' ? '평균 진입가' : '평균단가'}>{formatPrice(holding.averagePrice)} RP</td>
                      <td data-label="현재가">{formatPrice(holding.currentPrice)} RP</td>
                      <td data-label={holding.positionType === 'short' ? '상환액' : '평가액'}>{formatRp(holding.marketValue)}</td>
                      <td data-label="평가손익" className={movementClass(holding.evaluationProfit)}>{holding.evaluationProfit > 0 ? '+' : ''}{formatRp(holding.evaluationProfit)}</td>
                      <td data-label="수익률" className={movementClass(holding.returnPercent)}>{formatPercent(holding.returnPercent)}</td>
                    </tr>
                  )) : (
                    <tr><td className="admin-table-empty" colSpan={8}>현재 보유하거나 공매도 중인 종목이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

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
