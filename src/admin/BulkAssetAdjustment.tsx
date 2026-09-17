import { Search } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { adjustAdminAssets, createAdminRequestKey } from '../services/admin'
import { formatPrice, formatRp } from '../lib/format'
import type { AdminActionRunner, AdminAssetMode, AdminBulkAssetInput, AdminBulkAssetResult, AdminLeague, AdminParticipant, AdminParticipantAssetDirection, AdminParticipantAssetType, AdminStock } from '../types/admin'

interface Props {
  leagues: AdminLeague[]
  participants: AdminParticipant[]
  stocks: AdminStock[]
  busy: boolean
  onRun: AdminActionRunner
  onSelectParticipant: (id: string) => void
}
interface TierInput { id: string; upTo: string; percent: string }

export function BulkAssetAdjustment({ leagues, participants, stocks, busy, onRun, onSelectParticipant }: Props) {
  const operatingLeagues = leagues.filter(({ status }) => status === 'active' || status === 'registration')
  const [leagueId, setLeagueId] = useState(operatingLeagues[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [assetType, setAssetType] = useState<AdminParticipantAssetType>('rp')
  const [direction, setDirection] = useState<AdminParticipantAssetDirection>('grant')
  const [mode, setMode] = useState<AdminAssetMode>('fixed')
  const [amount, setAmount] = useState('')
  const [stockId, setStockId] = useState('')
  const [reason, setReason] = useState('')
  const [tiers, setTiers] = useState<TierInput[]>([{ id: 'first', upTo: '500000', percent: '0' }, { id: 'second', upTo: '1000000', percent: '5' }, { id: 'last', upTo: '', percent: '10' }])
  const [preview, setPreview] = useState<{ input: AdminBulkAssetInput; result: AdminBulkAssetResult } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const inFlight = useRef(false)
  const disabled = busy || loading
  const leaguePlayers = participants.filter((player) => player.leagueId === leagueId)
  const leagueOpen = operatingLeagues.some((league) => league.id === leagueId)
  const eligible = leaguePlayers.filter((player) => leagueOpen && !player.disqualifiedAt)
  const selectedIds = selected.filter((id) => eligible.some((player) => player.id === id))
  const visible = leaguePlayers.filter((player) => player.nickname.toLocaleLowerCase('ko-KR').includes(query.trim().toLocaleLowerCase('ko-KR')))
  const availableStocks = stocks.filter((stock) => stock.leagueId === leagueId && (stock.status === 'active' || stock.status === 'halted'))
  const directionLabel = direction === 'grant' ? '지급' : '회수'
  const unit = assetType === 'rp' ? 'RP' : assetType === 'stock' ? '주' : '개'
  const displayAmount = (value: number) => `${formatPrice(value)} ${unit}`

  function invalidate() { setPreview(null); setError(null); setNotice(null) }
  function toggle(id: string) {
    invalidate()
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }
  function updateTier(index: number, field: 'upTo' | 'percent', value: string) {
    invalidate()
    setTiers((current) => current.map((tier, at) => at === index ? { ...tier, [field]: value } : tier))
  }
  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || disabled || !selectedIds.length) return
    inFlight.current = true
    setLoading(true); setError(null); setNotice(null); setPreview(null)
    const input: AdminBulkAssetInput = {
      leagueId, participantIds: selectedIds, assetType, direction, mode,
      amount: mode === 'tiers' ? null : Number(amount),
      tiers: mode === 'tiers' ? tiers.map((tier, index) => ({ upTo: index === tiers.length - 1 ? null : Number(tier.upTo), percent: Number(tier.percent) })) : null,
      stockId: assetType === 'stock' ? stockId : null, reason, requestKey: createAdminRequestKey(),
    }
    try { setPreview({ input, result: await adjustAdminAssets(input) }) }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : '미리보기를 불러오지 못했습니다.') }
    finally { setLoading(false); inFlight.current = false }
  }
  async function execute() {
    if (!preview || inFlight.current || disabled) return
    inFlight.current = true
    setLoading(true)
    const completed = await onRun(async () => {
      const result = await adjustAdminAssets(preview.input, preview.result.players)
      const count = result.players.filter((player) => player.status === 'completed').length
      setNotice(`${count}명 ${directionLabel} 완료 · ${result.players.length - count}명은 계산 금액이 0이라 변경하지 않았습니다.`)
    }, `선택한 플레이어의 자산 ${directionLabel}을 완료했습니다.`)
    // Keep the request key after an uncertain response so retry cannot double-charge.
    if (completed) setPreview(null)
    setLoading(false); inFlight.current = false
  }

  return <section className="admin-bulk-assets" aria-label="플레이어 선택 및 일괄 자산 조정">
    <div className="admin-form__columns admin-form">
      <label><span>대상 리그</span><select value={leagueId} disabled={disabled} onChange={(event) => { setLeagueId(event.target.value); setSelected([]); setStockId(''); invalidate() }}>
        {!leagueId && <option value="">리그 선택</option>}
        {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
      </select></label>
      <label><span>닉네임 검색</span><span className="admin-search"><Search size={16} aria-hidden="true" /><input value={query} disabled={disabled} onChange={(event) => setQuery(event.target.value)} placeholder="닉네임 검색" /></span></label>
    </div>
    <div className="admin-bulk-toolbar">
      <strong>{selectedIds.length}명 선택</strong>
      <button className="secondary-button" type="button" disabled={disabled || !eligible.length} onClick={() => { setSelected(eligible.map(({ id }) => id)); invalidate() }}>전체 선택</button>
      <button className="secondary-button" type="button" disabled={disabled || !selectedIds.length} onClick={() => { setSelected([]); invalidate() }}>전체 선택 해제</button>
      <span>{leagueOpen ? '전체 선택은 검색과 관계없이 이 리그의 제재되지 않은 모든 플레이어에 적용됩니다.' : '종료·중단된 리그는 자산 조회만 가능합니다.'}</span>
    </div>
    <div className="admin-table-wrap admin-participant-table-wrap">
      <table className="admin-table admin-responsive-table admin-bulk-player-table">
        <thead><tr><th>선택</th><th>플레이어</th><th>순자산</th><th>보유 RP</th><th>토큰</th><th>상태</th></tr></thead>
        <tbody>{visible.map((player) => <tr key={player.id} className={selectedIds.includes(player.id) ? 'is-selected' : undefined}>
          <td data-label="선택"><input type="checkbox" aria-label={`${player.nickname} 선택`} checked={selectedIds.includes(player.id)} disabled={disabled || !leagueOpen || Boolean(player.disqualifiedAt)} onChange={() => toggle(player.id)} /></td>
          <td data-label="플레이어"><button className="admin-participant-select" type="button" onClick={() => onSelectParticipant(player.id)}>{player.nickname}</button></td>
          <td data-label="순자산"><strong>{formatRp(player.netWorth)}</strong></td><td data-label="보유 RP">{formatRp(player.cashBalance)}</td>
          <td data-label="토큰">{formatPrice(player.attendanceTokens)}개</td><td data-label="상태">{player.disqualifiedAt ? '리그 제재' : player.isSpectator ? '관전자' : '정상'}</td>
        </tr>)}{!visible.length && <tr><td colSpan={6} className="admin-table-empty">조건에 맞는 플레이어가 없습니다.</td></tr>}</tbody>
      </table>
    </div>
    <form className="admin-form" onSubmit={(event) => void handlePreview(event)}>
      <h3>선택한 플레이어 자산 지급·회수</h3>
      <fieldset disabled={disabled} className="admin-bulk-fields">
        <div className="admin-form__columns">
          <label><span>작업</span><select value={direction} onChange={(event) => { setDirection(event.target.value as AdminParticipantAssetDirection); invalidate() }}><option value="grant">지급</option><option value="revoke">회수</option></select></label>
          <label><span>자산 종류</span><select value={assetType} onChange={(event) => { setAssetType(event.target.value as AdminParticipantAssetType); setMode('fixed'); setAmount(''); invalidate() }}><option value="rp">RP</option><option value="attendance_token">출석토큰</option><option value="stock">상장주식</option></select></label>
          <label><span>계산 방식</span><select value={mode} onChange={(event) => { setMode(event.target.value as AdminAssetMode); setAmount(''); invalidate() }}><option value="fixed">동일 금액·수량</option>{assetType === 'rp' && <><option value="percent">순자산의 일정 비율</option><option value="tiers">순자산 구간별 비율</option></>}</select></label>
          {assetType === 'stock' && <label><span>종목</span><select value={stockId} required onChange={(event) => { setStockId(event.target.value); invalidate() }}><option value="">종목 선택</option>{availableStocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.name}</option>)}</select></label>}
          {mode !== 'tiers' && <label><span>{mode === 'percent' ? '비율 (%)' : `1인당 금액·수량 (${unit})`}</span><input type="number" required min={mode === 'percent' ? 0 : 1} max={mode === 'percent' ? 100 : 9000000000000000} step={mode === 'percent' ? '0.01' : '1'} value={amount} onChange={(event) => { setAmount(event.target.value); invalidate() }} /></label>}
        </div>
        {mode === 'tiers' && <div className="admin-asset-tiers">
          {tiers.map((tier, index) => <div className="admin-asset-tier" key={tier.id}>
            <span>{index === 0 ? '순자산' : `${formatPrice(Number(tiers[index - 1].upTo))} RP 초과`}</span>
            {index < tiers.length - 1 ? <label><span>상한 (RP 이하)</span><input aria-label={`${index + 1}구간 상한 RP`} type="number" min={index === 0 ? 0 : Number(tiers[index - 1].upTo) + 1} max={9000000000000000} step="1" required value={tier.upTo} onChange={(event) => updateTier(index, 'upTo', event.target.value)} /></label> : <span>상한 없음</span>}
            <label><span>{directionLabel} 비율 (%)</span><input aria-label={`${index + 1}구간 비율`} type="number" min="0" max="100" step="0.01" required value={tier.percent} onChange={(event) => updateTier(index, 'percent', event.target.value)} /></label>
            {index < tiers.length - 1 && <button className="secondary-button" type="button" aria-label={`${index + 1}구간 삭제`} onClick={() => { setTiers((current) => current.filter((_, at) => at !== index)); invalidate() }}>삭제</button>}
          </div>)}
          <button className="secondary-button" type="button" onClick={() => { setTiers((current) => [...current.slice(0, -1), { id: createAdminRequestKey(), upTo: '', percent: '0' }, current[current.length - 1]]); invalidate() }}>구간 추가</button>
        </div>}
        {mode !== 'fixed' && <p className="admin-form__hint">해당 구간의 비율을 순자산 전체에 적용합니다. 순자산이 0 이하이면 0 RP, 계산 결과는 1 RP 미만을 버립니다.</p>}
        <label><span>사유{assetType === 'rp' ? ' · 플레이어 RP 내역에 표시됩니다' : ''}</span><textarea required minLength={5} maxLength={500} rows={2} value={reason} onChange={(event) => { setReason(event.target.value); invalidate() }} /></label>
        <p className="admin-form__hint">RP 회수 시 부족분은 미수 RP가 됩니다. 토큰·주식이 부족하거나 처리할 수 없는 대상이 있으면 전체 작업을 반영하지 않습니다.</p>
        <button className="secondary-button" type="submit" disabled={!selectedIds.length}>{loading ? '확인 중…' : '대상별 금액 미리보기'}</button>
      </fieldset>
    </form>
    {error && <p className="admin-feedback is-error" role="alert">{error}</p>}
    {notice && <p className="admin-feedback is-success" role="status">{notice}</p>}
    {preview && <section className="admin-bulk-preview" aria-label="자산 조정 미리보기">
      <h3>{preview.result.players.length}명 · 총 {displayAmount(preview.result.players.reduce((sum, player) => sum + player.amount, 0))} {directionLabel}</h3>
      <div className="admin-table-wrap"><table className="admin-table admin-responsive-table">
        <thead><tr><th>플레이어</th><th>기준 순자산</th><th>비율</th><th>{directionLabel} 금액·수량</th></tr></thead>
        <tbody>{preview.result.players.map((player) => <tr key={player.participantId}><td data-label="플레이어">{player.nickname}</td><td data-label="기준 순자산">{formatRp(player.netWorth)}</td><td data-label="비율">{player.percent === null ? '금액 지정' : `${player.percent}%`}</td><td data-label={`${directionLabel} 금액·수량`}>{displayAmount(player.amount)}{player.amount === 0 ? ' · 변경 없음' : ''}</td></tr>)}</tbody>
      </table></div>
      <p className="admin-form__hint">미리보기 이후 자산이 바뀌면 다시 확인해야 합니다.</p>
      <button className={direction === 'revoke' ? 'danger-button' : 'primary-button'} type="button" disabled={disabled} onClick={() => void execute()}>확인한 {preview.result.players.length}명에게 {directionLabel} 실행</button>
    </section>}
  </section>
}
