import { RefreshCw, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { loadAdminConsole } from '../services/admin'
import type { AdminActionRunner, AdminConsoleState } from '../types/admin'
import { AdminAuditPanel } from './AdminAuditPanel'
import { GlobalNewsAdminPanel } from './GlobalNewsAdminPanel'
import { LeagueAdminPanel } from './LeagueAdminPanel'
import { ParticipantAdminPanel } from './ParticipantAdminPanel'
import { SettlementAdminPanel } from './SettlementAdminPanel'
import { StockAdminPanel } from './StockAdminPanel'

export function AdminPage() {
  const [consoleState, setConsoleState] = useState<AdminConsoleState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      setConsoleState(await loadAdminConsole())
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '관리자 정보를 불러오지 못했습니다.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const runAction: AdminActionRunner = useCallback(async (action, successMessage) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      await refresh(false)
      setNotice(successMessage)
      return true
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '관리 작업을 완료하지 못했습니다.')
      return false
    } finally {
      setBusy(false)
    }
  }, [refresh])

  if (loading) {
    return (
      <section className="empty-state" aria-live="polite">
        <span className="brand-loader" />
        <p>리그 운영 정보를 불러오는 중입니다.</p>
      </section>
    )
  }

  if (!consoleState) {
    return (
      <section className="empty-state admin-access-denied">
        <ShieldCheck size={32} aria-hidden="true" />
        <h1>관리자 정보를 불러오지 못했습니다</h1>
        <button className="secondary-button" type="button" onClick={() => void refresh()}>
          다시 시도
        </button>
      </section>
    )
  }

  const operatingLeagueCount = consoleState.leagues.filter(({ status }) => status === 'registration' || status === 'active').length
  const activeParticipantCount = consoleState.participants.filter(({ disqualifiedAt }) => !disqualifiedAt).length
  const activeStockCount = consoleState.stocks.filter(({ status }) => status === 'active').length
  const missingPlanCount = consoleState.stocks.reduce((total, stock) => total + stock.missingPlanCount, 0)

  return (
    <div className="admin-page">
      <header className="admin-hero">
        <div>
          <span className="eyebrow">운영 권한 · {consoleState.role === 'owner' ? '소유자' : '운영자'}</span>
          <h1>리그 관리</h1>
          <p>리그와 참가자, 종목 상장, 라운드별 가격·기사를 한곳에서 관리합니다.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw size={16} aria-hidden="true" /> 새로고침
        </button>
      </header>

      {(error || notice) && (
        <div className={`admin-feedback${error ? ' is-error' : ' is-success'}`} role={error ? 'alert' : 'status'}>
          {error ?? notice}
        </div>
      )}

      <section className="admin-metrics" aria-label="운영 현황">
        <article><span>운영 리그</span><strong>{operatingLeagueCount}</strong></article>
        <article><span>활성 참가자</span><strong>{activeParticipantCount}</strong></article>
        <article><span>거래 종목</span><strong>{activeStockCount}</strong></article>
        <article><span>미입력 계획</span><strong>{missingPlanCount}</strong></article>
      </section>

      <div className="admin-panel-grid">
        <GlobalNewsAdminPanel
          leagues={consoleState.leagues}
          busy={busy}
          onRun={runAction}
        />
        <SettlementAdminPanel
          leagues={consoleState.leagues}
          busy={busy}
          onRun={runAction}
        />
        <LeagueAdminPanel leagues={consoleState.leagues} busy={busy} onRun={runAction} />
        <ParticipantAdminPanel
          leagues={consoleState.leagues}
          participants={consoleState.participants}
          stocks={consoleState.stocks}
          busy={busy}
          onRun={runAction}
        />
        <StockAdminPanel
          leagues={consoleState.leagues}
          participants={consoleState.participants}
          stocks={consoleState.stocks}
          busy={busy}
          onRun={runAction}
        />
      </div>

      <AdminAuditPanel entries={consoleState.auditLog} />
    </div>
  )
}
