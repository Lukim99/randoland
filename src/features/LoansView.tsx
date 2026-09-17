import { Landmark, LockKeyhole, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { formatKstDateTime, formatRp } from '../lib/format'
import { useMarket } from '../market/useMarket'
import { borrowLoan, loadLoanState, loanInterest, LoanRequestError } from '../services/loans'
import type { LoanState } from '../types/loans'
import { ParticipantGate } from './ParticipantGate'

function LoanAccount({ leagueId }: { leagueId: string }) {
  const { myState, refresh } = useMarket()
  const [state, setState] = useState<LoanState | null>(null)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const request = useRef<{ amount: number; version: string; key: string } | null>(null)
  const loadSequence = useRef(0)

  const reload = useCallback(async () => {
    const sequence = ++loadSequence.current
    try {
      const next = await loadLoanState(leagueId)
      if (sequence === loadSequence.current) setState(next)
    } catch (nextError) {
      if (sequence === loadSequence.current) setError(nextError instanceof Error ? nextError.message : '대출 정보를 불러오지 못했습니다.')
    }
  }, [leagueId])

  const latestEntryId = myState?.ledger[0]?.id
  useEffect(() => {
    void reload()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void reload() }, 30000)
    const onFocus = () => void reload()
    window.addEventListener('focus', onFocus)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [reload, latestEntryId])

  const settings = state?.settings
  const principal = Number(amount)
  const interest = loanInterest(principal, settings?.interestPercent ?? 0)
  const eligible = Number.isSafeInteger(principal) && principal > 0 && principal <= (state?.available ?? 0)
  const outstanding = state?.loans.filter((loan) => !loan.repaidAt) ?? []
  const completed = state?.loans.filter((loan) => loan.repaidAt) ?? []

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !settings || (!uncertain && !eligible)) return
    if (!confirming) {
      request.current = { amount: principal, version: settings.version, key: crypto.randomUUID() }
      setError(null); setNotice(null); setConfirming(true); return
    }
    if (!request.current) request.current = { amount: principal, version: settings.version, key: crypto.randomUUID() }
    setBusy(true); setError(null)
    try {
      const loan = await borrowLoan(leagueId, request.current.amount, request.current.version, request.current.key)
      request.current = null
      setUncertain(false); setConfirming(false); setAmount('')
      setNotice(`${formatRp(loan.principal)} 대출이 완료되었습니다. ${formatKstDateTime(loan.dueAt)}에 ${formatRp(loan.repaymentAmount)}가 자동 상환됩니다.`)
      await reload()
      await refresh()
    } catch (nextError) {
      const unknownResult = !(nextError instanceof LoanRequestError) || nextError.uncertain
      setUncertain(unknownResult)
      setError(unknownResult ? '처리 결과를 확인하지 못했습니다. 아래 버튼으로 같은 요청의 결과를 다시 확인해 주세요.' : nextError.message)
      if (!unknownResult) { request.current = null; setConfirming(false); await reload() }
    } finally { setBusy(false) }
  }

  return <div className="feature-stack loan-view">
    <section className="panel loan-bank">
      <header className="loan-heading"><div><Landmark size={24} aria-hidden="true" /><h2>란도뱅크</h2></div>
        <button type="button" className="secondary-button" aria-label="대출 정보 새로고침" disabled={busy} onClick={() => { setError(null); void reload() }}><RefreshCw size={16} aria-hidden="true" /></button>
      </header>
      {error && <p className="loan-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="loan-feedback" role="status">{notice}</p>}
      {!state && !error && <p className="muted-empty" role="status">대출 정보를 불러오는 중입니다.</p>}
      {state && <>
        {!state.isOpen && !uncertain && <div className="loan-closed"><LockKeyhole size={32} aria-hidden="true" /><p>현재 란도뱅크가 닫혀있습니다. 대출은 다음에 이용해주세요.</p></div>}
        <dl className="loan-summary">
          <div><dt>미상환 원금</dt><dd>{formatRp(state.outstandingPrincipal)}</dd></div>
          <div><dt>확정 이자</dt><dd>{formatRp(state.outstandingInterest)}</dd></div>
          <div><dt>총 상환 예정액</dt><dd>{formatRp(state.outstandingPrincipal + state.outstandingInterest)}</dd></div>
        </dl>
        {(state.isOpen || uncertain) && settings && <form className="loan-form" onSubmit={(event) => void submit(event)}>
          <div className="loan-available"><span>지금 대출 가능한 금액</span><strong>{formatRp(state.available)}</strong><small>미상환 원금 한도 {formatRp(settings.principalLimit)}</small></div>
          <dl className="loan-terms">
            <div><dt>대출 가능 기간</dt><dd>{formatKstDateTime(settings.opensAt)} ~ {formatKstDateTime(settings.closesAt)} (KST)</dd></div>
            <div><dt>자동 상환</dt><dd>대출받은 시점부터 {settings.termDays}일 후</dd></div>
            <div><dt>대출 이율</dt><dd>{settings.interestPercent}% · 대출 건별 1회 적용</dd></div>
          </dl>
          <label className="loan-amount"><span>대출 금액 (RP)</span><input type="number" inputMode="numeric" min="1" max={state.available} step="1" required value={amount} disabled={busy || confirming || uncertain} placeholder="대출받을 금액" onChange={(event) => setAmount(event.target.value)} /></label>
          {eligible && <p className="loan-estimate">원금 {formatRp(principal)} + 이자 {formatRp(interest)} = <strong>{formatRp(principal + interest)}</strong> 상환</p>}
          <p className="loan-note">이자는 1 RP 미만을 올림합니다. 원금과 확정 이자는 즉시 순자산에서 차감됩니다. 만기에 현금이 부족하면 미수 RP가 발생하며, 주식은 자동으로 매도하지 않습니다. 받은 RP는 기존 미수 RP부터 상환합니다.</p>
          {confirming && !uncertain && <p className="loan-confirm" role="status">위 금액과 조건으로 대출을 실행합니다.</p>}
          <div className="loan-actions">
            <button type="submit" className="primary-button" disabled={busy || (!uncertain && (!eligible || !state.isOpen))}>{busy ? '처리 중…' : uncertain ? '같은 요청 결과 확인' : confirming ? '확인 후 대출 실행' : '대출받기'}</button>
            {confirming && !uncertain && <button type="button" className="secondary-button" disabled={busy} onClick={() => { request.current = null; setConfirming(false) }}>금액 수정</button>}
          </div>
        </form>}
      </>}
    </section>
    {state && <section className="panel loan-history">
      <header className="loan-heading"><h2>대출 내역</h2><Link to="/portfolio">RP 내역은 내 자산에서</Link></header>
      {!state.loans.length && <p className="muted-empty">대출 내역이 없습니다.</p>}
      {[...outstanding.sort((a, b) => a.dueAt.localeCompare(b.dueAt)), ...completed].map((loan) => <article className="loan-history-card" key={loan.id}>
        <div className="loan-history-title"><strong>{formatRp(loan.principal)}</strong><span className={`loan-status${loan.repaidAt ? ' is-completed' : ''}`}>{loan.repaidAt ? '상환 처리 완료' : '상환 예정'}</span></div>
        <dl className="loan-terms">
          <div><dt>대출일</dt><dd>{formatKstDateTime(loan.borrowedAt)}</dd></div>
          <div><dt>{loan.repaidAt ? '상환 처리일' : '자동 상환일'}</dt><dd>{formatKstDateTime(loan.repaidAt ?? loan.dueAt)}</dd></div>
          <div><dt>이자 · {loan.interestPercent}%</dt><dd>{formatRp(loan.interest)}</dd></div>
          <div><dt>원리금</dt><dd>{formatRp(loan.repaymentAmount)}</dd></div>
          {loan.repaidAt && <div><dt>현금 차감</dt><dd>{formatRp(loan.cashApplied ?? 0)}</dd></div>}
          {!!loan.receivableCreated && <div><dt>미수 RP 전환</dt><dd>{formatRp(loan.receivableCreated)}</dd></div>}
        </dl>
      </article>)}
      {!!completed.length && <p className="loan-note">상환 완료 내역은 최근 50건까지 표시합니다.</p>}
    </section>}
  </div>
}

export function LoansView() {
  const { market, myState } = useMarket()
  return <ParticipantGate>{market?.league && myState?.participant && <LoanAccount key={myState.participant.id} leagueId={market.league.id} />}</ParticipantGate>
}
