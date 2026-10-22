import { Landmark, Plus, RefreshCw, Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { formatRp } from '../lib/format'
import { createAdminRequestKey } from '../services/admin'
import { loadBankState, loadLeverageSettings, saveBankProduct, saveLeverageSettings } from '../services/bank'
import type { AdminActionRunner, AdminLeague } from '../types/admin'
import type { BankKind, BankProduct, BankState, BankTerms, LeverageSettings } from '../types/bank'

function kstInput(value: string) { return new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(0, 16) }

function ProductForm({ leagueId, state, product, busy, onRun, onSaved }: {
  leagueId: string; state: BankState; product: BankProduct | null; busy: boolean; onRun: AdminActionRunner; onSaved: () => Promise<void>
}) {
  const initial = product?.pendingTerms ?? product?.terms
  const [kind, setKind] = useState<BankKind>(product?.kind ?? 'savings')
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [opens, setOpens] = useState(initial ? kstInput(initial.opensAt) : '')
  const [closes, setCloses] = useState(initial ? kstInput(initial.closesAt) : '')
  const [maximum, setMaximum] = useState(initial ? String(initial.maxPrincipal) : '')
  const [interest, setInterest] = useState(String(initial?.interestPercent ?? 0))
  const [days, setDays] = useState(String(initial?.lockDays ?? 1))
  const [risk, setRisk] = useState<NonNullable<BankTerms['risk']>>(initial?.risk ?? 'medium')
  const [start, setStart] = useState(initial?.startRound ?? state.currentRound + 1)
  const [end, setEnd] = useState(initial?.endRound ?? state.roundCount)
  const [returns, setReturns] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(initial?.roundReturns ?? {}).map(([key, value]) => [key, String(value)])))
  const request = useRef<{ signature: string; key: string } | null>(null)
  const rounds = Array.from({ length: Math.max(0, Math.min(state.roundCount, end) - Math.max(1, start) + 1) }, (_, i) => Math.max(1, start) + i)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const terms: BankTerms = { name: name.trim(), description: description.trim(), enabled, opensAt: new Date(`${opens}+09:00`).toISOString(), closesAt: new Date(`${closes}+09:00`).toISOString(), maxPrincipal: Number(maximum) }
    if (kind === 'savings') Object.assign(terms, { interestPercent: Number(interest), lockDays: Number(days) })
    else Object.assign(terms, { risk, startRound: start, endRound: end, roundReturns: { ...initial?.roundReturns, ...Object.fromEntries(rounds.map((n) => [n, Number(returns[n])])) } })
    const signature = JSON.stringify([leagueId, product?.id, kind, terms, product?.version])
    if (request.current?.signature !== signature) request.current = { signature, key: createAdminRequestKey() }
    const key = request.current.key
    if (await onRun(() => saveBankProduct(leagueId, product?.id ?? null, kind, terms, product?.version ?? null, key), product ? '상품 변경을 다음 라운드에 적용하도록 예약했습니다.' : '상품을 저장했습니다.')) await onSaved()
  }

  return <form className="admin-form bank-product-form" onSubmit={(event) => void submit(event)}>
    <h3>{product ? '상품 조건 수정' : '새 상품 등록'}</h3>
    <div className="admin-form__columns">
      <label><span>상품 구분</span><select value={kind} disabled={busy || !!product} onChange={(event) => setKind(event.target.value as BankKind)}><option value="savings">적금</option><option value="fund">펀드</option></select></label>
      <label><span>상품명</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required disabled={busy} /></label>
      <label><span>플레이어별 가입 원금 한도 (RP)</span><input type="number" min="1" max="9000000000000000" step="1" value={maximum} onChange={(event) => setMaximum(event.target.value)} required disabled={busy} /></label>
      <label><span>가입 상태</span><select value={String(enabled)} onChange={(event) => setEnabled(event.target.value === 'true')} disabled={busy}><option value="true">가입 허용</option><option value="false">가입 닫기</option></select></label>
      <label><span>가입 시작 (KST)</span><input type="datetime-local" value={opens} onChange={(event) => setOpens(event.target.value)} required disabled={busy} /></label>
      <label><span>가입 마감 (KST)</span><input type="datetime-local" value={closes} onChange={(event) => setCloses(event.target.value)} required disabled={busy} /></label>
      {kind === 'savings' ? <>
        <label><span>만기 이율 (%)</span><input type="number" min="0" step="0.0001" value={interest} onChange={(event) => setInterest(event.target.value)} required disabled={busy} /></label>
        <label><span>가입일부터 잠금 기간 (일)</span><input type="number" min="1" max="3650" step="1" value={days} onChange={(event) => setDays(event.target.value)} required disabled={busy} /></label>
      </> : <>
        <label><span>위험도</span><select value={risk} onChange={(event) => setRisk(event.target.value as typeof risk)} disabled={busy}><option value="low">낮음</option><option value="medium">중간</option><option value="high">위험</option></select></label>
        <label><span>운용 시작 라운드</span><input type="number" min={product ? 1 : state.currentRound + 1} max={state.roundCount} step="1" value={start} onChange={(event) => setStart(Number(event.target.value))} required disabled={busy} /></label>
        <label><span>운용 종료 라운드</span><input type="number" min={Math.max(start, state.currentRound + 1)} max={state.roundCount} step="1" value={end} onChange={(event) => setEnd(Number(event.target.value))} required disabled={busy} /></label>
      </>}
    </div>
    <label><span>상품 설명</span><textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} required disabled={busy} /></label>
    {kind === 'fund' && <fieldset className="bank-round-returns"><legend>라운드별 수익률</legend><p className="admin-form__hint">직전 평가액에 누적 적용합니다. 미래 수익률은 플레이어에게 공개되지 않습니다.</p><div className="admin-form__columns">{rounds.map((n) => <label key={n}><span>{n}라운드 (%)</span><input type="number" min="-100" step="0.0001" value={returns[n] ?? ''} onChange={(event) => setReturns((current) => ({ ...current, [n]: event.target.value }))} required disabled={busy || (!!product && n <= state.currentRound)} /></label>)}</div></fieldset>}
    <p className="admin-form__hint">{product ? `${state.currentRound + 1}라운드부터 적용합니다. 적금은 기존 가입분의 이율·잠금 기간도 바뀌며, 최초 가입일 기준으로 만기일을 다시 계산합니다.` : '적금은 중도 해지할 수 없으며 펀드는 현재 공개 평가액으로 환매합니다.'}</p>
    <button className="primary-button" type="submit" disabled={busy}><Save size={15} aria-hidden="true" />{product ? '변경 저장' : '상품 등록'}</button>
  </form>
}

function LeagueBankAdmin({ leagueId, busy, onRun }: { leagueId: string; busy: boolean; onRun: AdminActionRunner }) {
  const [state, setState] = useState<BankState | null>(null)
  const [leverage, setLeverage] = useState<LeverageSettings | null>(null)
  const [percent, setPercent] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const leverageRequest = useRef<{ signature: string; key: string } | null>(null)
  const reload = useCallback(async () => {
    try {
      const [bank, settings] = await Promise.all([loadBankState(leagueId, true), loadLeverageSettings(leagueId)])
      setState(bank); setLeverage(settings); setPercent(String(settings.pending?.percent ?? settings.currentPercent)); setError(null)
    } catch (next: unknown) { setError(next instanceof Error ? next.message : '운영 설정을 불러오지 못했습니다.') }
  }, [leagueId])
  useEffect(() => { void reload() }, [reload])
  const product = state?.products.find(({ id }) => id === selected) ?? null
  async function submitLeverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const signature = `${leagueId}:${percent}`
    if (leverageRequest.current?.signature !== signature) leverageRequest.current = { signature, key: createAdminRequestKey() }
    const key = leverageRequest.current.key
    if (await onRun(() => saveLeverageSettings(leagueId, Number(percent), key), '레버리지 비율을 저장했습니다.')) { leverageRequest.current = null; await reload() }
  }
  return <>
    <div className="bank-admin-toolbar"><button className="secondary-button" disabled={busy} type="button" onClick={() => void reload()}><RefreshCw size={14} aria-hidden="true" />새로고침</button></div>
    {error && <p className="loan-feedback is-error" role="alert">{error}</p>}
    {leverage && <form className="admin-form bank-leverage-form" onSubmit={(event) => void submitLeverage(event)}><h3>거래소 레버리지 한도</h3><p className="admin-form__hint">현재 {leverage.currentPercent}% · {leverage.pending ? `${leverage.pending.effectiveRound}라운드부터 ${leverage.pending.percent}% 예약` : '예약된 변경 없음'}</p><label><span>최대 비율 (%)</span><input type="number" min="0" step="0.01" value={percent} onChange={(event) => setPercent(event.target.value)} required disabled={busy} /></label><p className="admin-form__hint">100% 초과도 설정할 수 있습니다. {leverage.nextRound}라운드의 신규 주문부터 적용하며 기존 보유분은 유지합니다.</p><button className="secondary-button" disabled={busy} type="submit"><Save size={14} aria-hidden="true" />한도 저장</button></form>}
    {state && <>
      <div className="bank-admin-product-list"><button type="button" className={`secondary-button${!selected ? ' is-active' : ''}`} disabled={busy} onClick={() => setSelected(null)}><Plus size={14} aria-hidden="true" />새 상품</button>{state.products.map((item) => <button key={item.id} type="button" className={`secondary-button${selected === item.id ? ' is-active' : ''}`} disabled={busy} onClick={() => setSelected(item.id)}>{item.kind === 'savings' ? '적금' : '펀드'} · {item.terms.name}{item.effectiveRound ? ` · ${item.effectiveRound}R 변경 예정` : ''}</button>)}</div>
      {product && <p className="admin-form__hint">현재 플레이어별 가입 한도 {formatRp(product.terms.maxPrincipal)}</p>}
      <ProductForm key={`${product?.id ?? 'new'}:${product?.version ?? ''}`} leagueId={leagueId} state={state} product={product} busy={busy} onRun={onRun} onSaved={reload} />
    </>}
    {!state && !error && <p className="admin-empty-copy" role="status">운영 설정을 불러오는 중입니다.</p>}
  </>
}

export function BankAdminPanel({ leagues, busy, onRun }: { leagues: AdminLeague[]; busy: boolean; onRun: AdminActionRunner }) {
  const operating = leagues.filter(({ status }) => status === 'active' || status === 'registration')
  const [selected, setSelected] = useState('')
  const leagueId = operating.find(({ id }) => id === selected)?.id ?? operating[0]?.id ?? ''
  return <section className="admin-panel admin-panel--bank"><header className="admin-panel__header"><span className="admin-panel__icon"><Landmark size={19} aria-hidden="true" /></span><div><h2>적금·펀드와 레버리지 관리</h2></div></header>{leagueId ? <><div className="admin-form"><label><span>관리 리그</span><select value={leagueId} disabled={busy} onChange={(event) => setSelected(event.target.value)}>{operating.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></label></div><LeagueBankAdmin key={leagueId} leagueId={leagueId} busy={busy} onRun={onRun} /></> : <p className="admin-empty-copy">설정할 운영 리그가 없습니다.</p>}</section>
}
