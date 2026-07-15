import { AlertTriangle, Bot, Clock3, Sparkles, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatKstDateTime } from '../lib/format'
import {
  createAdminRequestKey,
  loadAdminAiSettlementState,
  runAdminAiSettlement,
} from '../services/admin'
import type {
  AdminActionRunner,
  AdminAiSettlementState,
  AdminLeague,
} from '../types/admin'

interface AiSettlementAdminPanelProps {
  leagues: AdminLeague[]
  busy: boolean
  onRun: AdminActionRunner
}

const roundStatusLabels: Record<string, string> = {
  scheduled: '예정',
  open: '진행 중',
  locked: '주문 잠금',
  settling: '정산 중',
  failed: '복구 대기',
}

export function AiSettlementAdminPanel({ leagues, busy, onRun }: AiSettlementAdminPanelProps) {
  const activeLeague = leagues.find(({ status }) => status === 'active') ?? null
  const [settlementState, setSettlementState] = useState<AdminAiSettlementState | null>(null)
  const [stateLoading, setStateLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const pendingRequestKey = useRef<string | null>(null)

  const refreshSettlementState = useCallback(async () => {
    if (!activeLeague) {
      setSettlementState(null)
      return
    }

    setStateLoading(true)
    setLocalError(null)
    try {
      setSettlementState(await loadAdminAiSettlementState(activeLeague.id))
    } catch (error) {
      setSettlementState(null)
      setLocalError(error instanceof Error ? error.message : 'AI 정산 상태를 불러오지 못했습니다.')
    } finally {
      setStateLoading(false)
    }
  }, [activeLeague])

  useEffect(() => {
    pendingRequestKey.current = null
    void refreshSettlementState()
  }, [refreshSettlementState])

  async function handleRunSettlement() {
    const round = settlementState?.round
    if (!activeLeague || !round || !settlementState.canExecute) return

    const confirmed = window.confirm(
      `${round.roundNumber}라운드를 지금 실제 정산합니다. AI 뉴스 발행, 전 종목 가격 변동, 대기 주문 체결과 다음 라운드 전환이 즉시 반영됩니다. 계속할까요?`,
    )
    if (!confirmed) return

    const requestKey = pendingRequestKey.current ?? createAdminRequestKey()
    pendingRequestKey.current = requestKey
    setRunning(true)
    try {
      const completed = await onRun(
        () => runAdminAiSettlement({ leagueId: activeLeague.id, requestKey }),
        `${round.roundNumber}라운드 AI 정산이 실제 시장에 반영되었습니다.`,
      )

      if (completed) {
        pendingRequestKey.current = null
        await refreshSettlementState()
      }
    } finally {
      setRunning(false)
    }
  }

  const round = settlementState?.round

  return (
    <section className="admin-panel admin-panel--ai-settlement">
      <header className="admin-panel__header admin-ai-settlement__header">
        <span className="admin-panel__icon"><Sparkles size={19} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">AI SETTLEMENT</span>
          <h2>현재 라운드 즉시 정산</h2>
          <p>오전 9시 자동 정산과 같은 AI 정산 엔진을 현재 라운드에 즉시 실행합니다.</p>
        </div>
      </header>

      <div className="admin-ai-settlement__notice" role="note">
        <Bot size={19} aria-hidden="true" />
        <div>
          <strong>뉴스와 등락률을 직접 입력하지 않습니다.</strong>
          <p>AI가 글로벌 이벤트와 종목 설정을 분석해 메인뉴스·개별뉴스와 전 종목 등락을 만들고, 주문·자산·캔들·다음 라운드까지 실제 운영 데이터에 반영합니다.</p>
        </div>
      </div>

      {localError && <div className="admin-feedback is-error" role="alert">{localError}</div>}

      {stateLoading ? (
        <div className="admin-ai-settlement__loading" aria-live="polite">
          <span className="brand-loader" /> 현재 라운드를 확인하는 중입니다.
        </div>
      ) : round ? (
        <div className={`admin-ai-settlement__round${round.isEarly ? ' is-early' : ''}`}>
          <div className="admin-ai-settlement__round-title">
            <span className="eyebrow">{settlementState?.leagueName}</span>
            <strong>{round.roundNumber}라운드</strong>
            <span>{roundStatusLabels[round.status] ?? round.status}</span>
          </div>
          <dl>
            <div>
              <dt><Clock3 size={13} aria-hidden="true" /> 예정 시각</dt>
              <dd>{formatKstDateTime(round.settlesAt)}</dd>
            </div>
            <div><dt>대기 주문</dt><dd>{round.waitingOrderCount}건</dd></div>
            <div><dt>활성 종목</dt><dd>{settlementState?.activeStockCount ?? 0}개</dd></div>
          </dl>
          {round.isEarly && (
            <p><AlertTriangle size={14} aria-hidden="true" /> 예정 시각 전 실행하면 현재 라운드가 즉시 종료됩니다.</p>
          )}
        </div>
      ) : (
        <p className="admin-empty-copy">{settlementState?.blockedReason ?? '운영 중인 정산 대상이 없습니다.'}</p>
      )}

      {round && !settlementState?.canExecute && (
        <div className="admin-feedback is-error" role="status">{settlementState?.blockedReason}</div>
      )}

      <div className="admin-ai-settlement__action">
        <div>
          <strong>실제 운영 정산</strong>
          <p>중복 요청은 같은 실행 키로 처리되며, 진행 중인 자동 정산은 15분 동안 다시 실행할 수 없습니다.</p>
        </div>
        <button
          className="danger-button"
          type="button"
          onClick={() => void handleRunSettlement()}
          disabled={busy || stateLoading || !settlementState?.canExecute || !round}
        >
          <Zap size={15} aria-hidden="true" />
          {running ? 'AI 정산 실행 중' : '현재 라운드 즉시 정산하기'}
        </button>
      </div>
    </section>
  )
}
