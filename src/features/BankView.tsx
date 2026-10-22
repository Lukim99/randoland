import { ArrowRight, ChevronDown, Landmark, LockKeyhole, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { formatKstDateTime, formatPercent, formatRp, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'
import { createAdminRequestKey } from '../services/admin'
import { loadBankState, savingsMaturity, transactBank } from '../services/bank'
import { LoanRequestError } from '../services/loans'
import type { BankHolding, BankKind, BankProduct, BankState } from '../types/bank'
import { LoansView } from './LoansView'
import { ParticipantGate } from './ParticipantGate'

const riskLabel = { low: '낮음', medium: '중간', high: '위험' }

function BankTradeForm({ leagueId, product, cash, principal, balance, canSubscribe, onSaved }: {
  leagueId: string; product: BankProduct; cash: number; principal: number; balance: number; canSubscribe: boolean; onSaved: () => Promise<void>
}) {
  const [action, setAction] = useState<'subscribe' | 'redeem'>('subscribe')
  const [amount, setAmount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const request = useRef<{ key: string; version: string; amount: number; action: 'subscribe' | 'redeem' } | null>(null)
  const maximum = action === 'redeem' ? balance : Math.max(0, Math.min(cash, product.terms.maxPrincipal - principal))
  const unavailable = action === 'subscribe' && !canSubscribe
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!confirming) {
      if (!Number.isSafeInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > maximum) { setMessage('가능한 범위 안에서 정수 RP를 입력해 주세요.'); return }
      request.current = { key: createAdminRequestKey(), version: product.version, amount: Number(amount), action }
      setConfirming(true); setMessage(null); return
    }
    const current = request.current
    if (!current || busy) return
    setBusy(true); setMessage(null)
    try {
      await transactBank(leagueId, product.id, current.action, current.amount, current.version, current.key)
      request.current = null; setConfirming(false); setUncertain(false); setAmount('')
      setMessage(current.action === 'subscribe' ? '가입을 완료했습니다.' : '환매 RP가 반영되었습니다.')
      await onSaved()
    } catch (next: unknown) {
      const unknownResult = !(next instanceof LoanRequestError) || next.uncertain
      setUncertain(unknownResult)
      if (!unknownResult) { request.current = null; setConfirming(false) }
      setMessage(unknownResult ? '처리 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요.' : next.message)
    } finally { setBusy(false) }
  }
  return <form className="bank-trade-form" onSubmit={(event) => void submit(event)}>
    {product.kind === 'fund' && <div className="bank-action-tabs" aria-label="펀드 거래 선택">{(['subscribe', 'redeem'] as const).map((value) => <button type="button" key={value} aria-pressed={action === value} disabled={busy || confirming} onClick={() => { setAction(value); setMessage(null); setAmount('') }}>{value === 'subscribe' ? '투자하기' : '중도 환매'}</button>)}</div>}
    <label><span>{action === 'redeem' ? '환매' : '가입'} 금액 (RP)</span><input type="number" min="1" max={maximum} step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={busy || confirming || unavailable} inputMode="numeric" /></label>
    <div className="bank-form-limit"><span>최대 {formatRp(maximum)}</span><button className="text-button" type="button" disabled={busy || confirming || unavailable || maximum < 1} onClick={() => setAmount(String(maximum))}>최대 금액</button></div>
    {confirming && <div className="bank-confirmation"><strong>{formatRp(request.current?.amount ?? Number(amount))} {action === 'redeem' ? '환매' : '가입'}</strong><p>{action === 'redeem' ? '현재 공개 평가액으로 환매하며, 받은 RP는 미수 RP부터 상환합니다.' : product.kind === 'savings' ? '중도 해지가 불가능합니다. 관리자 변경 시 기존 가입분의 이율과 만기일도 다음 라운드부터 조정됩니다.' : '손실이 발생할 수 있습니다. 수익률은 매 라운드 직전 평가액에 누적 적용됩니다.'}</p></div>}
    {unavailable && <p className="loan-note">현재 가입할 수 없는 상품입니다.</p>}
    {message && <p className="loan-feedback" role="status">{message}</p>}
    <div className="bank-form-actions"><button type="submit" className="primary-button" disabled={busy || (unavailable && !confirming) || (!confirming && maximum < 1)}>{busy ? '처리 중…' : uncertain ? '같은 요청 결과 확인' : confirming ? action === 'redeem' ? '환매 확정' : '가입 확정' : action === 'redeem' ? '환매 내용 확인' : '가입 내용 확인'}<ArrowRight size={16} aria-hidden="true" /></button>{confirming && !uncertain && <button type="button" className="secondary-button" disabled={busy} onClick={() => { request.current = null; setConfirming(false) }}>금액 수정</button>}</div>
  </form>
}

function HoldingHistory({ holding, product }: { holding: BankHolding; product: BankProduct }) {
  const savings = product.kind === 'savings'
  const active = holding.status === 'active'
  const profit = (active ? holding.balance : 0) + holding.paidAmount - holding.initialPrincipal
  return <details className="bank-holding"><summary><span><strong>{product.terms.name}</strong><small>{formatKstDateTime(holding.subscribedAt)} 가입</small></span><span><strong>{active ? formatRp(holding.balance) : formatRp(holding.paidAmount)}</strong><small>{active ? savings ? '잠금 중' : '운용 중' : holding.status === 'redeemed' ? '환매 완료' : '만기 완료'}</small></span><ChevronDown size={16} aria-hidden="true" /></summary><dl className="loan-terms"><div><dt>가입 원금</dt><dd>{formatRp(holding.initialPrincipal)}</dd></div>{active && !savings && <div><dt>평가손익</dt><dd className={movementClass(profit)}>{profit > 0 ? '+' : ''}{formatRp(profit)}</dd></div>}{savings && <><div><dt>현재 만기 이율</dt><dd>{holding.interestPercent}%</dd></div><div><dt>만기일</dt><dd>{holding.dueAt && formatKstDateTime(holding.dueAt)}</dd></div><div><dt>만기 수령액</dt><dd>{formatRp(savingsMaturity(holding.initialPrincipal, holding.interestPercent ?? 0))}</dd></div></>}{!savings && holding.lastRound !== null && <div><dt>최근 {holding.lastRound}라운드 수익률</dt><dd className={movementClass(holding.lastReturnPercent ?? 0)}>{formatPercent(holding.lastReturnPercent ?? 0)}</dd></div>}{holding.paidAmount > 0 && <div><dt>누적 수령액</dt><dd>{formatRp(holding.paidAmount)}</dd></div>}</dl></details>
}

function BankAccount({ leagueId, kind }: { leagueId: string; kind: BankKind }) {
  const { market, myState, refreshPersonal } = useMarket()
  const [state, setState] = useState<BankState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const sequence = useRef(0)
  const invalidate = useCallback(() => { sequence.current++ }, [])
  const reload = useCallback(async () => {
    const id = ++sequence.current
    setRefreshing(true)
    try { const next = await loadBankState(leagueId); if (id === sequence.current) { setState(next); setError(null) } }
    catch (next: unknown) { if (id === sequence.current) setError(next instanceof Error ? next.message : '상품을 불러오지 못했습니다.') }
    finally { if (id === sequence.current) setRefreshing(false) }
  }, [leagueId])
  useEffect(() => { void reload(); return invalidate }, [reload, invalidate, market?.round?.id, market?.round?.status])
  const nextMaturity = state?.holdings.filter((holding) => holding.status === 'active' && holding.dueAt).reduce((next, holding) => Math.min(next, Date.parse(holding.dueAt!)), Infinity) ?? Infinity
  useEffect(() => {
    if (!Number.isFinite(nextMaturity)) return
    const timer = window.setTimeout(() => { if (!document.hidden) void reload() }, Math.min(2147483647, Math.max(60000, nextMaturity - Date.now() + 65000)))
    return () => window.clearTimeout(timer)
  }, [nextMaturity, reload, state?.serverTime])
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) void reload() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])
  const products = state?.products.filter((product) => product.kind === kind) ?? []
  const holdings = state?.holdings.filter((holding) => products.some(({ id }) => id === holding.productId)) ?? []
  const activeBalance = holdings.filter(({ status }) => status === 'active').reduce((sum, holding) => sum + holding.balance, 0)
  const cash = myState?.participant?.availableCash ?? 0
  const afterTrade = useCallback(async () => { await Promise.all([reload(), refreshPersonal()]) }, [reload, refreshPersonal])
  return <div className="bank-account">
    <section className="bank-overview panel"><div><span className="eyebrow">란도뱅크 {kind === 'savings' ? '적금' : '펀드'}</span><h2>{kind === 'savings' ? '만기까지 맡기는 RP' : '이벤트에 투자하는 RP'}</h2><p>맡긴 RP는 총자산·순위와 모든 거래 한도에서 제외됩니다.</p></div><dl><div><dt>{kind === 'savings' ? '적금 원금' : '펀드 평가액'}</dt><dd>{formatRp(activeBalance)}</dd></div><div><dt>주문 가능 RP</dt><dd>{formatRp(cash)}</dd></div></dl></section>
    <div className="bank-section-heading"><h2>가입 상품</h2><button className="secondary-button" type="button" disabled={refreshing} onClick={() => void reload()}><RefreshCw size={14} aria-hidden="true" />새로고침</button></div>
    {error && <p className="loan-feedback is-error" role="alert">{error}</p>}
    {!state && !error && <p role="status" className="muted-empty">상품을 불러오는 중입니다.</p>}
    {state && !products.length && <section className="panel bank-empty"><Landmark size={28} aria-hidden="true" /><p>등록된 {kind === 'savings' ? '적금' : '펀드'} 상품이 없습니다.</p></section>}
    <div className="bank-product-grid">{products.map((product) => {
      const own = holdings.filter((holding) => holding.productId === product.id && holding.status === 'active')
      const principal = own.reduce((sum, holding) => sum + holding.principal, 0)
      const balance = own.reduce((sum, holding) => sum + holding.balance, 0)
      const canSubscribe = ['active', 'registration'].includes(market?.league?.status ?? '') && !myState?.participant?.disqualifiedAt && !myState?.participant?.receivableRp && product.terms.enabled && Date.now() >= Date.parse(product.terms.opensAt) && Date.now() < Date.parse(product.terms.closesAt) && (kind === 'savings' || (state?.currentRound ?? 0) <= (product.terms.endRound ?? 0))
      return <article className="panel bank-product" key={product.id}><header><span className="theme-pill">{kind === 'savings' ? '적금' : `위험도 ${riskLabel[product.terms.risk ?? 'medium']}`}</span><h3>{product.terms.name}</h3><p>{product.terms.description}</p></header><dl className="loan-terms"><div><dt>가입 원금 한도</dt><dd>{formatRp(product.terms.maxPrincipal)}</dd></div>{kind === 'savings' ? <><div><dt>만기 이율</dt><dd>{product.terms.interestPercent}%</dd></div><div><dt>잠금 기간</dt><dd><LockKeyhole size={13} aria-hidden="true" />가입 후 {product.terms.lockDays}일</dd></div></> : <div><dt>운용 기간</dt><dd>{product.terms.startRound}~{product.terms.endRound}라운드</dd></div>}<div><dt>가입 시작</dt><dd>{formatKstDateTime(product.terms.opensAt)}</dd></div><div><dt>가입 마감</dt><dd>{formatKstDateTime(product.terms.closesAt)}</dd></div>{balance > 0 && <div><dt>{kind === 'savings' ? '가입 원금' : '내 평가액'}</dt><dd>{formatRp(balance)}</dd></div>}</dl>{product.pendingTerms && <p className="bank-pending" role="status">{product.effectiveRound}라운드부터 조건 변경{kind === 'savings' ? ` · 이율 ${product.pendingTerms.interestPercent}% · 잠금 ${product.pendingTerms.lockDays}일` : ''}</p>}<BankTradeForm leagueId={leagueId} product={product} cash={cash} principal={principal} balance={balance} canSubscribe={!!canSubscribe} onSaved={afterTrade} /></article>
    })}</div>
    {holdings.length > 0 && <section className="panel bank-history"><h2>내 가입·환매 내역</h2>{holdings.map((holding) => <HoldingHistory key={holding.id} holding={holding} product={products.find(({ id }) => id === holding.productId)!} />)}<p className="loan-note">완료 내역은 최근 50건까지 표시합니다. RP 입출금은 내 자산의 RP 내역에서 확인할 수 있습니다.</p></section>}
  </div>
}

export function BankView() {
  const [tab, setTab] = useState<'loans' | BankKind>('loans')
  const { market, myState } = useMarket()
  return <><div className="bank-tabs" aria-label="란도뱅크 상품 선택">{([['loans', '대출'], ['savings', '적금'], ['fund', '펀드']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>{tab === 'loans' ? <LoansView /> : <ParticipantGate>{market?.league && myState?.participant && <BankAccount key={`${myState.participant.id}:${tab}`} leagueId={market.league.id} kind={tab} />}</ParticipantGate>}</>
}
