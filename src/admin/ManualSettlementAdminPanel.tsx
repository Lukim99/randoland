import { AlertTriangle, Newspaper, Plus, RefreshCw, Trash2, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { formatKstDateTime, formatRp } from '../lib/format'
import {
  createAdminRequestKey,
  finalizeAdminRoundNow,
  loadAdminManualSettlementState,
} from '../services/admin'
import type {
  AdminActionRunner,
  AdminLeague,
  AdminManualSettlementInput,
  AdminManualSettlementState,
} from '../types/admin'

interface ManualSettlementAdminPanelProps {
  leagues: AdminLeague[]
  busy: boolean
  onRun: AdminActionRunner
}

interface BriefDraft {
  id: string
  headline: string
  summary: string
  affectedStockIds: string[]
}

const CONFIRMATION_TEXT = '즉시 정산'

export function ManualSettlementAdminPanel({ leagues, busy, onRun }: ManualSettlementAdminPanelProps) {
  const activeLeagues = leagues.filter(({ status }) => status === 'active')
  const [leagueId, setLeagueId] = useState('')
  const [settlementState, setSettlementState] = useState<AdminManualSettlementState | null>(null)
  const [stateLoading, setStateLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [priceChanges, setPriceChanges] = useState<Record<string, string>>({})
  const [mainHeadline, setMainHeadline] = useState('')
  const [mainSummary, setMainSummary] = useState('')
  const [mainBody, setMainBody] = useState('')
  const [briefs, setBriefs] = useState<BriefDraft[]>([])
  const [confirmation, setConfirmation] = useState('')
  const loadedRoundId = useRef<string | null>(null)
  const pendingRequest = useRef<{ signature: string; key: string } | null>(null)
  const selectedLeagueId = activeLeagues.some(({ id }) => id === leagueId)
    ? leagueId
    : activeLeagues[0]?.id ?? ''

  const refreshSettlementState = useCallback(async () => {
    if (!selectedLeagueId) {
      setSettlementState(null)
      setPriceChanges({})
      return
    }

    setStateLoading(true)
    setLocalError(null)
    try {
      const nextState = await loadAdminManualSettlementState(selectedLeagueId)
      setSettlementState(nextState)
      const nextRoundId = nextState.round?.id ?? null
      if (loadedRoundId.current !== nextRoundId) {
        loadedRoundId.current = nextRoundId
        setPriceChanges(Object.fromEntries(nextState.stocks.map((stock) => [stock.id, '0'])))
        setMainHeadline('')
        setMainSummary('')
        setMainBody('')
        setBriefs([])
        setConfirmation('')
        pendingRequest.current = null
      }
    } catch (error) {
      setSettlementState(null)
      setLocalError(error instanceof Error ? error.message : '수동 정산 상태를 불러오지 못했습니다.')
    } finally {
      setStateLoading(false)
    }
  }, [selectedLeagueId])

  useEffect(() => {
    void refreshSettlementState()
  }, [refreshSettlementState])

  function addBrief() {
    setBriefs((current) => [
      ...current,
      { id: createAdminRequestKey(), headline: '', summary: '', affectedStockIds: [] },
    ])
  }

  function updateBrief(briefId: string, patch: Partial<Omit<BriefDraft, 'id'>>) {
    setBriefs((current) => current.map((brief) => (
      brief.id === briefId ? { ...brief, ...patch } : brief
    )))
  }

  function toggleBriefStock(briefId: string, stockId: string, checked: boolean) {
    setBriefs((current) => current.map((brief) => {
      if (brief.id !== briefId) return brief
      const affectedStockIds = checked
        ? Array.from(new Set([...brief.affectedStockIds, stockId]))
        : brief.affectedStockIds.filter((id) => id !== stockId)
      return { ...brief, affectedStockIds }
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const round = settlementState?.round
    if (!settlementState?.canExecute || !round) return

    if (confirmation.trim() !== CONFIRMATION_TEXT) {
      setLocalError(`확인 문구에 “${CONFIRMATION_TEXT}”을 입력해 주세요.`)
      return
    }

    if (briefs.some((brief) => brief.affectedStockIds.length === 0)) {
      setLocalError('각 개별뉴스에 영향을 받는 종목을 한 개 이상 선택해 주세요.')
      return
    }

    const priceItems = settlementState.stocks.map((stock) => {
      const changePercent = Number(priceChanges[stock.id] ?? 0)
      return {
        stockId: stock.id,
        sentiment: Math.max(-1, Math.min(1, changePercent / 30)),
        eventStrength: 1,
        changePercent,
      }
    })

    if (priceItems.some(({ changePercent }) => !Number.isFinite(changePercent) || changePercent < -30 || changePercent > 30)) {
      setLocalError('모든 종목의 등락률을 -30%부터 +30% 사이로 입력해 주세요.')
      return
    }

    const payload = {
      leagueId: settlementState.leagueId,
      roundId: round.id,
      priceItems,
      mainArticle: {
        headline: mainHeadline.trim(),
        summary: mainSummary.trim(),
        body: mainBody.trim(),
      },
      briefs: briefs.map(({ headline, summary, affectedStockIds }) => ({
        headline: headline.trim(),
        summary: summary.trim(),
        affectedStockIds,
      })),
    }
    const signature = JSON.stringify(payload)
    let request = pendingRequest.current
    if (!request || request.signature !== signature) {
      request = { signature, key: createAdminRequestKey() }
      pendingRequest.current = request
    }

    const input: AdminManualSettlementInput = { ...payload, requestKey: request.key }
    setLocalError(null)
    const completed = await onRun(
      () => finalizeAdminRoundNow(input),
      `${round.roundNumber}라운드 뉴스·가격·주문 정산을 실제 시장에 반영했습니다.`,
    )

    if (completed) {
      pendingRequest.current = null
      await refreshSettlementState()
    }
  }

  const round = settlementState?.round

  return (
    <section className="admin-panel admin-panel--manual-settlement">
      <header className="admin-panel__header admin-manual-header">
        <span className="admin-panel__icon"><Zap size={19} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">MANUAL SETTLEMENT</span>
          <h2>즉시 뉴스·가격 반영</h2>
          <p>자동 정산 장애 복구 또는 실제 반영 확인을 위해 현재 라운드를 즉시 정산합니다.</p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void refreshSettlementState()}
          disabled={busy || stateLoading || !selectedLeagueId}
        >
          <RefreshCw size={15} aria-hidden="true" /> 상태 새로고침
        </button>
      </header>

      <div className="admin-manual-warning" role="note">
        <AlertTriangle size={18} aria-hidden="true" />
        <div>
          <strong>미리보기가 아닌 실제 정산입니다.</strong>
          <p>뉴스, 전 종목 가격, 캔들, 대기 주문, 자산 원장과 다음 라운드 상태가 한 번에 반영되며 자동 복구되지 않습니다.</p>
        </div>
      </div>

      <label className="admin-manual-league-select">
        <span>대상 리그</span>
        <select value={selectedLeagueId} onChange={(event) => setLeagueId(event.target.value)} disabled={activeLeagues.length === 0 || busy}>
          {activeLeagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
        </select>
      </label>

      {localError && <div className="admin-feedback is-error" role="alert">{localError}</div>}

      {stateLoading ? (
        <div className="admin-manual-loading" aria-live="polite"><span className="brand-loader" /> 수동 정산 상태를 확인하고 있습니다.</div>
      ) : round ? (
        <div className={`admin-manual-round${round.isEarly ? ' is-early' : ''}`}>
          <div>
            <span className="eyebrow">현재 대상</span>
            <strong>{round.roundNumber}라운드 · {round.status}</strong>
          </div>
          <dl>
            <div><dt>예정 시각</dt><dd>{formatKstDateTime(round.settlesAt)}</dd></div>
            <div><dt>대기 주문</dt><dd>{round.waitingOrderCount}건</dd></div>
            <div><dt>활성 종목</dt><dd>{settlementState.stocks.length}개</dd></div>
          </dl>
          {round.isEarly && <p><AlertTriangle size={14} aria-hidden="true" /> 예정 시각 전 실행하면 이 라운드가 조기 종료됩니다.</p>}
        </div>
      ) : (
        <p className="admin-empty-copy">{settlementState?.blockedReason ?? '정산 가능한 현재 라운드가 없습니다.'}</p>
      )}

      {round && !settlementState?.canExecute && (
        <div className="admin-feedback is-error" role="status">{settlementState?.blockedReason}</div>
      )}

      <form className="admin-form admin-manual-form" onSubmit={(event) => void handleSubmit(event)}>
        <section className="admin-manual-section" aria-labelledby="manual-price-heading">
          <div className="admin-manual-section__heading">
            <div><span className="eyebrow">PRICE</span><h3 id="manual-price-heading">전 종목 등락률</h3></div>
            <span className="count-chip">-30% ~ +30%</span>
          </div>
          <div className="admin-price-input-grid">
            {settlementState?.stocks.map((stock) => (
              <label key={stock.id}>
                <span><strong>{stock.name}</strong><small>{stock.ticker} · {formatRp(stock.currentPrice)}</small></span>
                <span className="admin-percent-input">
                  <input
                    type="number"
                    min="-30"
                    max="30"
                    step="0.01"
                    value={priceChanges[stock.id] ?? '0'}
                    onChange={(event) => setPriceChanges((current) => ({ ...current, [stock.id]: event.target.value }))}
                    disabled={busy || !settlementState?.canExecute}
                    required
                  />
                  <b>%</b>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="admin-manual-section" aria-labelledby="manual-main-news-heading">
          <div className="admin-manual-section__heading">
            <div><span className="eyebrow">MAIN NEWS</span><h3 id="manual-main-news-heading">메인뉴스</h3></div>
            <Newspaper size={17} aria-hidden="true" />
          </div>
          <label><span>제목</span><input value={mainHeadline} onChange={(event) => setMainHeadline(event.target.value)} minLength={10} maxLength={140} disabled={busy || !settlementState?.canExecute} required /></label>
          <label><span>요약</span><textarea value={mainSummary} onChange={(event) => setMainSummary(event.target.value)} minLength={20} maxLength={600} rows={3} disabled={busy || !settlementState?.canExecute} required /></label>
          <label><span>본문</span><textarea value={mainBody} onChange={(event) => setMainBody(event.target.value)} minLength={100} maxLength={6000} rows={8} disabled={busy || !settlementState?.canExecute} required /></label>
        </section>

        <section className="admin-manual-section" aria-labelledby="manual-brief-heading">
          <div className="admin-manual-section__heading">
            <div><span className="eyebrow">BRIEF NEWS</span><h3 id="manual-brief-heading">개별뉴스</h3></div>
            <button className="secondary-button" type="button" onClick={addBrief} disabled={busy || !settlementState?.canExecute}>
              <Plus size={14} aria-hidden="true" /> 뉴스 추가
            </button>
          </div>
          <p className="admin-form__hint">기사에는 영향을 받는 종목명과 티커를 직접 노출하지 마세요. 종목 선택 정보는 가격 영향 연결에만 사용됩니다.</p>
          {briefs.length === 0 ? (
            <p className="admin-empty-copy">개별뉴스 없이 메인뉴스만 발행할 수 있습니다.</p>
          ) : (
            <div className="admin-brief-drafts">
              {briefs.map((brief, index) => (
                <fieldset className="admin-brief-draft" key={brief.id}>
                  <legend>개별뉴스 {index + 1}</legend>
                  <button className="admin-icon-button" type="button" aria-label={`개별뉴스 ${index + 1} 삭제`} onClick={() => setBriefs((current) => current.filter(({ id }) => id !== brief.id))} disabled={busy}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                  <label><span>제목</span><input value={brief.headline} onChange={(event) => updateBrief(brief.id, { headline: event.target.value })} minLength={5} maxLength={100} disabled={busy} required /></label>
                  <label><span>요약</span><textarea value={brief.summary} onChange={(event) => updateBrief(brief.id, { summary: event.target.value })} minLength={10} maxLength={300} rows={3} disabled={busy} required /></label>
                  <div className="admin-brief-targets">
                    <span>영향 종목</span>
                    <div>
                      {settlementState?.stocks.map((stock) => (
                        <label key={stock.id}>
                          <input
                            type="checkbox"
                            checked={brief.affectedStockIds.includes(stock.id)}
                            onChange={(event) => toggleBriefStock(brief.id, stock.id, event.target.checked)}
                            disabled={busy}
                          />
                          <span>{stock.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>
          )}
        </section>

        <section className="admin-manual-confirm">
          <div>
            <strong>최종 확인</strong>
            <p>아래 입력란에 “{CONFIRMATION_TEXT}”을 입력해야 실행할 수 있습니다.</p>
          </div>
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={CONFIRMATION_TEXT} autoComplete="off" disabled={busy || !settlementState?.canExecute} />
          <button className="danger-button" type="submit" disabled={busy || stateLoading || !settlementState?.canExecute || confirmation.trim() !== CONFIRMATION_TEXT}>
            <Zap size={15} aria-hidden="true" /> {busy ? '실제 정산 반영 중' : '현재 라운드 즉시 정산'}
          </button>
        </section>
      </form>
    </section>
  )
}
