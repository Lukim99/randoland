import { Landmark } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { formatKstDateTime, formatRp } from '../lib/format'
import { loadLoanState, saveLoanSettings } from '../services/loans'
import type { AdminActionRunner, AdminLeague } from '../types/admin'
import type { LoanSettings, LoanState } from '../types/loans'

function localKst(value: string) { return new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(0, 16) }

function LoanSettingsForm({ leagueId, settings, busy, onRun, onSaved }: { leagueId: string; settings: LoanSettings | null; busy: boolean; onRun: AdminActionRunner; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? false)
  const [opensAt, setOpensAt] = useState(settings ? localKst(settings.opensAt) : '')
  const [closesAt, setClosesAt] = useState(settings ? localKst(settings.closesAt) : '')
  const [limit, setLimit] = useState(settings?.principalLimit.toString() ?? '')
  const [days, setDays] = useState(settings?.termDays.toString() ?? '')
  const [percent, setPercent] = useState(settings?.interestPercent.toString() ?? '0')
  const [error, setError] = useState<string | null>(null)
  const [requestKey] = useState(() => crypto.randomUUID())

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(null)
    if (!opensAt || !closesAt || closesAt <= opensAt) { setError('마감 시각은 시작 시각 이후여야 합니다.'); return }
    const ok = await onRun(() => saveLoanSettings(leagueId, {
      enabled, opensAt: new Date(`${opensAt}+09:00`).toISOString(), closesAt: new Date(`${closesAt}+09:00`).toISOString(),
      principalLimit: Number(limit), termDays: Number(days), interestPercent: Number(percent),
    }, settings?.version ?? null, requestKey), '대출 설정을 저장했습니다. 기존 대출의 이율과 상환일은 유지됩니다.')
    if (ok) onSaved()
  }

  return <form className="admin-form" onSubmit={(event) => void submit(event)}>
    <label className="loan-toggle"><input type="checkbox" checked={enabled} disabled={busy} onChange={(event) => setEnabled(event.target.checked)} /><span>설정한 기간에 대출 허용</span></label>
    <div className="admin-form__columns">
      <label><span>대출 시작 (KST)</span><input type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} required disabled={busy} /></label>
      <label><span>대출 마감 (KST)</span><input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} required disabled={busy} /></label>
      <label><span>플레이어별 미상환 원금 한도 (RP)</span><input type="number" min="1" max="9000000000000000" step="1" value={limit} onChange={(event) => setLimit(event.target.value)} required disabled={busy} /></label>
      <label><span>대출받은 시점부터 상환까지 (일)</span><input type="number" min="1" max="3650" step="1" value={days} onChange={(event) => setDays(event.target.value)} required disabled={busy} /></label>
      <label><span>대출 건별 이율 (%)</span><input type="number" min="0" max="10000" step="0.0001" value={percent} onChange={(event) => setPercent(event.target.value)} required disabled={busy} /></label>
    </div>
    <p className="admin-form__hint">이율은 대출 건별로 한 번 적용하며 0%도 가능합니다. 1 RP 미만 이자는 올림합니다. 만기에는 원리금을 현금에서 차감하고 부족분을 미수 RP로 전환합니다. 기존 대출의 조건은 변경되지 않습니다.</p>
    {error && <p role="alert" className="loan-feedback is-error">{error}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy ? '처리 중…' : '대출 설정 저장'}</button>
  </form>
}

function LeagueLoanSettings({ leagueId, busy, onRun }: { leagueId: string; busy: boolean; onRun: AdminActionRunner }) {
  const [state, setState] = useState<LoanState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    void loadLoanState(leagueId, true).then((next) => { if (active) { setState(next); setError(null) } }).catch((nextError: unknown) => { if (active) setError(nextError instanceof Error ? nextError.message : '대출 설정을 불러오지 못했습니다.') })
    return () => { active = false }
  }, [leagueId, revision])
  return <>
    {error && <p role="alert" className="loan-feedback is-error">{error}</p>}
    <button type="button" className="secondary-button" disabled={busy} onClick={() => setRevision((value) => value + 1)}>대출 설정 새로고침</button>
    {!state && !error && <p className="admin-empty-copy">대출 설정을 불러오는 중입니다.</p>}
    {state && <>
      <p className="admin-form__hint">현재 {state.isOpen ? '대출 가능' : '대출 닫힘'} · 미상환 원금 {formatRp(state.outstandingPrincipal)} · 확정 이자 {formatRp(state.outstandingInterest)}</p>
      <LoanSettingsForm key={`${state.settings?.version ?? 'new'}:${revision}`} leagueId={leagueId} settings={state.settings} busy={busy} onRun={onRun} onSaved={() => setRevision((value) => value + 1)} />
      {state.loans.length > 0 && <details className="loan-admin-history"><summary>미상환 대출 {state.loans.length}건</summary><div className="loan-admin-list">{state.loans.map((loan) => <article key={loan.id}><strong>{loan.nickname}</strong><span>원리금 {formatRp(loan.repaymentAmount)}</span><small>{formatKstDateTime(loan.dueAt)} 자동 상환</small></article>)}</div></details>}
    </>}
  </>
}

export function LoanAdminPanel({ leagues, busy, onRun }: { leagues: AdminLeague[]; busy: boolean; onRun: AdminActionRunner }) {
  const operating = leagues.filter((league) => ['active', 'registration'].includes(league.status))
  const [selectedId, setSelectedId] = useState('')
  const leagueId = operating.find(({ id }) => id === selectedId)?.id ?? operating[0]?.id ?? ''
  return <section className="admin-panel admin-panel--loans">
    <header className="admin-panel__header"><span className="admin-panel__icon"><Landmark size={19} aria-hidden="true" /></span><div><h2>란도뱅크 대출 관리</h2><p>대출 기간·한도·상환 일수·이율을 설정합니다.</p></div></header>
    {operating.length ? <>
      <label className="admin-form"><span>대출 관리 리그</span><select value={leagueId} disabled={busy} onChange={(event) => setSelectedId(event.target.value)}>{operating.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></label>
      <LeagueLoanSettings key={leagueId} leagueId={leagueId} busy={busy} onRun={onRun} />
    </> : <p className="admin-empty-copy">대출을 설정할 운영 리그가 없습니다.</p>}
  </section>
}
