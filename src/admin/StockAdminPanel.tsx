import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  ImageIcon,
  PlayCircle,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { SpritePickerDialog } from '../components/SpritePickerDialog'
import { StockLogo } from '../components/StockLogo'
import { StockLogoUploadDialog } from '../components/StockLogoUploadDialog'
import { formatPercent, formatPrice, movementClass } from '../lib/format'
import {
  activateAdminStock,
  delistAdminStock,
  listAdminStock,
  loadAdminStockEditor,
  saveAdminStockRoundPlans,
  updateAdminStock,
} from '../services/admin'
import type {
  AdminActionRunner,
  AdminLeague,
  AdminParticipant,
  AdminStock,
  AdminStockEditor as AdminStockEditorData,
  AdminStockRoundPlan,
} from '../types/admin'

interface StockAdminPanelProps {
  leagues: AdminLeague[]
  participants: AdminParticipant[]
  stocks: AdminStock[]
  busy: boolean
  onRun: AdminActionRunner
}

const stockStatusLabel: Record<string, string> = {
  pending: '설정 중',
  active: '거래 중',
  halted: '거래 정지',
  delisted: '제거됨',
  rejected: '등록 취소',
}

const roundStatusLabel: Record<string, string> = {
  scheduled: '예정',
  open: '진행 중',
  locked: '주문 잠금',
  settling: '정산 중',
  settled: '정산 완료',
  failed: '복구 대기',
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setUrl(null)
      return undefined
    }

    const nextUrl = URL.createObjectURL(file)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [file])

  return url
}

function nullableText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizePlans(plans: AdminStockRoundPlan[]) {
  return plans.map((plan) => ({
    ...plan,
    newsHeadline: nullableText(plan.newsHeadline ?? ''),
    newsBody: nullableText(plan.newsBody ?? ''),
  }))
}

function DraftStockForm({
  leagues,
  participants,
  stocks,
  busy,
  onRun,
  onCreated,
}: StockAdminPanelProps & { onCreated: (leagueId: string, ticker: string) => void }) {
  const operatingLeagues = leagues.filter(({ status }) => status === 'registration' || status === 'active')
  const [leagueId, setLeagueId] = useState('')
  const [ownerParticipantId, setOwnerParticipantId] = useState('')
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [initialPrice, setInitialPrice] = useState('10000')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState('')
  const [logoSpriteIndex, setLogoSpriteIndex] = useState(0)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [spritePickerOpen, setSpritePickerOpen] = useState(false)
  const [logoUploadOpen, setLogoUploadOpen] = useState(false)
  const logoPreviewUrl = useObjectUrl(logoFile)
  const selectedLeagueId = operatingLeagues.some(({ id }) => id === leagueId)
    ? leagueId
    : operatingLeagues[0]?.id ?? ''
  const availableParticipants = useMemo(() => participants.filter((participant) => (
    participant.leagueId === selectedLeagueId
    && !participant.disqualifiedAt
    && !stocks.some((stock) => (
      stock.leagueId === selectedLeagueId
      && stock.ownerParticipantId === participant.id
      && stock.status !== 'rejected'
    ))
  )), [participants, selectedLeagueId, stocks])
  const selectedOwnerId = availableParticipants.some(({ id }) => id === ownerParticipantId)
    ? ownerParticipantId
    : availableParticipants[0]?.id ?? ''

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedLeagueId || !selectedOwnerId) return

    const normalizedTicker = ticker.trim().toUpperCase()
    const completed = await onRun(
      () => listAdminStock({
        leagueId: selectedLeagueId,
        ownerParticipantId: selectedOwnerId,
        ticker: normalizedTicker,
        name: name.trim(),
        initialPrice: Number(initialPrice),
        description: description.trim(),
        theme: theme.trim(),
        logoSpriteIndex,
        logoFile,
      }),
      `${name.trim()} 종목 초안을 만들었습니다. 라운드 계획을 입력해 주세요.`,
    )

    if (completed) {
      onCreated(selectedLeagueId, normalizedTicker)
      setTicker('')
      setName('')
      setDescription('')
      setTheme('')
      setLogoFile(null)
      setLogoSpriteIndex(0)
    }
  }

  return (
    <form className="admin-form admin-stock-draft-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="admin-form__title-row">
        <div><span className="admin-step-badge">1</span><h3>종목 기본정보</h3></div>
        <p>상장할 참가자와 종목 정보를 먼저 등록합니다.</p>
      </div>

      <div className="admin-stock-logo-field">
        <StockLogo src={logoPreviewUrl} spriteIndex={logoSpriteIndex} size="lg" label="선택한 종목 로고" />
        <div><strong>종목 로고</strong><span>{logoFile?.name ?? '업로드 이미지가 없으면 기본 이미지를 사용합니다.'}</span></div>
        <div>
          <button type="button" className="secondary-button" onClick={() => setLogoUploadOpen(true)} disabled={busy}>
            <Upload size={14} /> 파일 업로드
          </button>
          <button type="button" className="secondary-button" onClick={() => setSpritePickerOpen(true)} disabled={busy}>
            <ImageIcon size={14} /> 기본 이미지
          </button>
        </div>
      </div>

      <div className="admin-form__columns">
        <label>
          <span>리그</span>
          <select value={selectedLeagueId} onChange={(event) => { setLeagueId(event.target.value); setOwnerParticipantId('') }} disabled={busy || operatingLeagues.length === 0}>
            {operatingLeagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
          </select>
        </label>
        <label>
          <span>상장 참가자</span>
          <select value={selectedOwnerId} onChange={(event) => setOwnerParticipantId(event.target.value)} disabled={busy || availableParticipants.length === 0} required>
            {availableParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.nickname}</option>)}
          </select>
        </label>
        <label><span>티커</span><input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} pattern="[A-Z0-9]{2,8}" maxLength={8} required /></label>
        <label><span>종목명</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} required /></label>
        <label><span>초기 가격</span><div className="input-with-unit"><input type="number" min="1" step="1" value={initialPrice} onChange={(event) => setInitialPrice(event.target.value)} required /><span>RP</span></div></label>
        <label><span>테마</span><input value={theme} onChange={(event) => setTheme(event.target.value)} maxLength={120} /></label>
      </div>
      <label><span>종목 설명</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={1000} rows={4} required /></label>

      {availableParticipants.length === 0 && selectedLeagueId && (
        <p className="admin-form__hint">상장 종목이 없는 참가자가 없습니다.</p>
      )}
      <button className="primary-button" type="submit" disabled={busy || !selectedLeagueId || !selectedOwnerId}>
        기본정보 저장 후 계획 입력
      </button>

      {spritePickerOpen && (
        <SpritePickerDialog
          kind="stock"
          value={logoSpriteIndex}
          title="기본 종목 이미지 선택"
          onClose={() => setSpritePickerOpen(false)}
          onConfirm={(index) => { setLogoSpriteIndex(index); setLogoFile(null); setSpritePickerOpen(false) }}
        />
      )}
      {logoUploadOpen && (
        <StockLogoUploadDialog
          currentImageUrl={logoPreviewUrl}
          fallbackSpriteIndex={logoSpriteIndex}
          onClose={() => setLogoUploadOpen(false)}
          onConfirm={(file) => { setLogoFile(file); setLogoUploadOpen(false) }}
        />
      )}
    </form>
  )
}

interface StockEditorProps {
  editor: AdminStockEditorData
  participants: AdminParticipant[]
  busy: boolean
  onRun: AdminActionRunner
  onReload: () => Promise<void>
}

function StockEditor({ editor, participants, busy, onRun, onReload }: StockEditorProps) {
  const { stock, league } = editor
  const [ownerParticipantId, setOwnerParticipantId] = useState(stock.ownerParticipantId ?? '')
  const [ticker, setTicker] = useState(stock.ticker)
  const [name, setName] = useState(stock.name)
  const [initialPrice, setInitialPrice] = useState(String(stock.initialPrice))
  const [description, setDescription] = useState(stock.description)
  const [theme, setTheme] = useState(stock.theme)
  const [logoSpriteIndex, setLogoSpriteIndex] = useState(stock.logoSpriteIndex)
  const [logoImagePath, setLogoImagePath] = useState<string | null>(stock.logoImagePath)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [plans, setPlans] = useState<AdminStockRoundPlan[]>(editor.plans)
  const [spritePickerOpen, setSpritePickerOpen] = useState(false)
  const [logoUploadOpen, setLogoUploadOpen] = useState(false)
  const [removeReason, setRemoveReason] = useState('')
  const logoPreviewUrl = useObjectUrl(logoFile)
  const eligibleParticipants = participants.filter((participant) => (
    participant.leagueId === stock.leagueId && !participant.disqualifiedAt
  ))
  const activationStartRound = league.status === 'registration'
    ? 1
    : (editor.currentRoundNumber ?? 0) + 1
  const missingRequiredPlans = plans.filter((plan) => (
    plan.roundNumber >= activationStartRound && plan.changePercent === null
  )).length

  function updatePlan(roundNumber: number, patch: Partial<AdminStockRoundPlan>) {
    setPlans((current) => current.map((plan) => (
      plan.roundNumber === roundNumber ? { ...plan, ...patch } : plan
    )))
  }

  function adjustPlanChange(plan: AdminStockRoundPlan, delta: number) {
    const currentValue = plan.changePercent ?? 0
    const nextValue = Math.min(30, Math.max(-30, Math.round((currentValue + delta) * 100) / 100))
    updatePlan(plan.roundNumber, { changePercent: nextValue })
  }

  async function handleDetailsSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const completed = await onRun(
      () => updateAdminStock({
        stockId: stock.id,
        expectedUpdatedAt: stock.updatedAt,
        ownerParticipantId: ownerParticipantId || null,
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        initialPrice: Number(initialPrice),
        description: description.trim(),
        theme: theme.trim(),
        logoSpriteIndex,
        logoImagePath,
        logoFile,
      }),
      `${stock.name} 종목 정보를 저장했습니다.`,
    )
    if (completed) await onReload()
  }

  async function handlePlansSave() {
    const completed = await onRun(
      () => saveAdminStockRoundPlans(stock.id, stock.updatedAt, normalizePlans(plans)),
      `${stock.name} 라운드 계획을 저장했습니다.`,
    )
    if (completed) await onReload()
  }

  async function handleActivate() {
    const actionLabel = league.status === 'registration' ? '상장 확정' : `${activationStartRound}라운드 상장 예약`
    if (!window.confirm(`${stock.name} 종목의 현재 계획을 저장하고 ${actionLabel}하시겠습니까? 종목명·상장가·로고는 이후 변경할 수 없습니다.`)) return

    const completed = await onRun(
      async () => {
        const saved = await saveAdminStockRoundPlans(
          stock.id,
          stock.updatedAt,
          normalizePlans(plans),
        )
        return activateAdminStock(stock.id, saved.updatedAt)
      },
      league.status === 'registration'
        ? `${stock.name} 종목을 상장했습니다.`
        : `${stock.name} 종목을 ${activationStartRound}라운드에 상장하도록 예약했습니다.`,
    )
    if (completed) await onReload()
  }

  async function handleRemove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!window.confirm(`${stock.name} 종목을 시장에서 제거하시겠습니까? 거래와 뉴스 이력은 보존됩니다.`)) return

    const completed = await onRun(
      () => delistAdminStock(stock.id, removeReason),
      `${stock.name} 종목을 시장에서 제거했습니다.`,
    )
    if (completed) {
      setRemoveReason('')
      await onReload()
    }
  }

  return (
    <div className="admin-stock-editor">
      <div className="admin-stock-editor__heading">
        <div>
          <span className="admin-step-badge">2</span>
          <span><small>{league.name}</small><strong>{stock.name} 라운드 계획</strong></span>
        </div>
        <span className={`admin-status admin-status--${stock.status}`}>
          {stock.activationRequestedAt && stock.status === 'pending'
            ? `${stock.activationRoundNumber}라운드 예약`
            : stockStatusLabel[stock.status] ?? stock.status}
        </span>
      </div>

      <form className="admin-form admin-stock-details-form" onSubmit={(event) => void handleDetailsSave(event)}>
        <div className="admin-form__title-row">
          <h3>종목 정보</h3>
          {!stock.identityEditable && <span><CheckCircle2 size={14} /> 상장 식별정보 잠김</span>}
        </div>

        <div className="admin-stock-logo-field">
          <StockLogo src={logoPreviewUrl ?? (logoImagePath ? stock.logoImageUrl : null)} spriteIndex={logoSpriteIndex} size="lg" label={`${stock.name} 로고`} />
          <div><strong>종목 로고</strong><span>{logoFile?.name ?? (logoImagePath ? '업로드 이미지' : `기본 이미지 ${logoSpriteIndex + 1}`)}</span></div>
          {stock.identityEditable && (
            <div>
              <button type="button" className="secondary-button" onClick={() => setLogoUploadOpen(true)} disabled={busy}><Upload size={14} /> 파일 업로드</button>
              <button type="button" className="secondary-button" onClick={() => setSpritePickerOpen(true)} disabled={busy}><ImageIcon size={14} /> 기본 이미지</button>
            </div>
          )}
        </div>

        <div className="admin-form__columns">
          <label><span>상장 참가자</span><select value={ownerParticipantId} onChange={(event) => setOwnerParticipantId(event.target.value)} disabled={!stock.identityEditable || busy}>{stock.isBaseStock && <option value="">기본 종목</option>}{eligibleParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.nickname}</option>)}</select></label>
          <label><span>티커</span><input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} disabled={!stock.identityEditable || busy} maxLength={8} required /></label>
          <label><span>종목명</span><input value={name} onChange={(event) => setName(event.target.value)} disabled={!stock.identityEditable || busy} minLength={2} maxLength={40} required /></label>
          <label><span>초기 가격</span><div className="input-with-unit"><input type="number" min="1" step="1" value={initialPrice} onChange={(event) => setInitialPrice(event.target.value)} disabled={!stock.identityEditable || busy} required /><span>RP</span></div></label>
          <label><span>테마</span><input value={theme} onChange={(event) => setTheme(event.target.value)} disabled={busy} maxLength={120} /></label>
          <label><span>현재 가격</span><div className="admin-readonly-value">{formatPrice(stock.currentPrice)} RP</div></label>
        </div>
        <label><span>종목 설명</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy} minLength={10} maxLength={1000} rows={4} required /></label>
        <button className="secondary-button" type="submit" disabled={busy}><Save size={14} /> 종목 정보 저장</button>
      </form>

      <section className="admin-round-plan-section">
        <header>
          <div><FileText size={17} /><span><strong>라운드별 등락·기사</strong><small>등락률은 필수이며, 개별기사는 필요한 라운드에만 제목과 본문을 함께 입력합니다.</small></span></div>
          <span>{plans.filter((plan) => plan.changePercent !== null).length}/{editor.roundCount} 입력</span>
        </header>

        <div className="admin-round-plan-list">
          {plans.map((plan) => (
            <details
              className={`admin-round-plan${plan.editable ? '' : ' is-locked'}`}
              key={plan.roundNumber}
              open={plan.roundNumber === editor.currentRoundNumber || (stock.status === 'pending' && plan.roundNumber === activationStartRound)}
            >
              <summary>
                <span><strong>{plan.roundNumber}라운드</strong><small>{plan.roundStatus ? roundStatusLabel[plan.roundStatus] ?? plan.roundStatus : '향후 라운드'}</small></span>
                <span className={plan.changePercent === null ? 'is-empty' : movementClass(plan.changePercent)}>
                  {plan.changePercent === null ? '등락 미입력' : formatPercent(plan.changePercent)}
                  {plan.newsHeadline && <small>기사 있음</small>}
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </summary>
              <div className="admin-round-plan__fields">
                <div className="admin-round-plan__field">
                  <label htmlFor={`round-change-${stock.id}-${plan.roundNumber}`}>등락률</label>
                  <div className="admin-percent-control">
                    <div className="input-with-unit">
                      <input
                        id={`round-change-${stock.id}-${plan.roundNumber}`}
                        type="number"
                        min="-30"
                        max="30"
                        step="0.01"
                        value={plan.changePercent ?? ''}
                        onChange={(event) => updatePlan(plan.roundNumber, {
                          changePercent: event.target.value === '' ? null : Number(event.target.value),
                        })}
                        disabled={busy || !plan.editable}
                        required={stock.status === 'active' && plan.roundNumber >= (editor.currentRoundNumber ?? 1)}
                      />
                      <span>%</span>
                    </div>
                    <div className="admin-percent-stepper">
                      <button
                        type="button"
                        aria-label={`${plan.roundNumber}라운드 등락률 0.1% 올리기`}
                        onClick={() => adjustPlanChange(plan, 0.1)}
                        disabled={busy || !plan.editable || (plan.changePercent ?? 0) >= 30}
                      >
                        <ChevronUp size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${plan.roundNumber}라운드 등락률 0.1% 내리기`}
                        onClick={() => adjustPlanChange(plan, -0.1)}
                        disabled={busy || !plan.editable || (plan.changePercent ?? 0) <= -30}
                      >
                        <ChevronDown size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <label><span>개별기사 제목</span><input value={plan.newsHeadline ?? ''} onChange={(event) => updatePlan(plan.roundNumber, { newsHeadline: event.target.value })} disabled={busy || !plan.editable} maxLength={140} placeholder="기사가 없는 라운드는 비워 둡니다." /></label>
                <label className="admin-round-plan__body"><span>개별기사 본문</span><textarea value={plan.newsBody ?? ''} onChange={(event) => updatePlan(plan.roundNumber, { newsBody: event.target.value })} disabled={busy || !plan.editable} maxLength={6000} rows={4} placeholder="게시할 문장 그대로 입력합니다." /></label>
              </div>
            </details>
          ))}
        </div>

        <div className="admin-round-plan-actions">
          <button className="secondary-button" type="button" onClick={() => void handlePlansSave()} disabled={busy}><Save size={14} /> 라운드 계획 저장</button>
          {stock.status === 'pending' && !stock.activationRequestedAt && (
            <button className="primary-button" type="button" onClick={() => void handleActivate()} disabled={busy || missingRequiredPlans > 0}>
              <PlayCircle size={15} /> {league.status === 'registration' ? '저장 후 상장 확정' : `저장 후 ${activationStartRound}라운드 상장 예약`}
            </button>
          )}
        </div>
        {stock.status === 'pending' && !stock.activationRequestedAt && missingRequiredPlans > 0 && (
          <p className="admin-form__hint">상장 예정 라운드부터 종료 라운드까지 {missingRequiredPlans}개의 등락률을 더 입력해야 합니다.</p>
        )}
      </section>

      {stock.status === 'pending' || stock.status === 'active' || stock.status === 'halted' ? (
        <form className="admin-form admin-form--danger" onSubmit={(event) => void handleRemove(event)}>
          <h3><Trash2 size={16} aria-hidden="true" /> 시장에서 제거</h3>
          <label><span>제거 사유</span><textarea value={removeReason} onChange={(event) => setRemoveReason(event.target.value)} minLength={5} maxLength={500} rows={3} required /></label>
          <p className="admin-form__hint">포지션이 남은 종목은 제거할 수 없으며 가격·뉴스·거래 이력은 보존됩니다.</p>
          <button className="danger-button" type="submit" disabled={busy}>종목 제거</button>
        </form>
      ) : null}

      {spritePickerOpen && (
        <SpritePickerDialog
          kind="stock"
          value={logoSpriteIndex}
          title="기본 종목 이미지 선택"
          onClose={() => setSpritePickerOpen(false)}
          onConfirm={(index) => { setLogoSpriteIndex(index); setLogoImagePath(null); setLogoFile(null); setSpritePickerOpen(false) }}
        />
      )}
      {logoUploadOpen && (
        <StockLogoUploadDialog
          currentImageUrl={logoPreviewUrl ?? stock.logoImageUrl}
          fallbackSpriteIndex={logoSpriteIndex}
          onClose={() => setLogoUploadOpen(false)}
          onConfirm={(file) => { setLogoFile(file); setLogoUploadOpen(false) }}
        />
      )}
    </div>
  )
}

export function StockAdminPanel({ leagues, participants, stocks, busy, onRun }: StockAdminPanelProps) {
  const [selectedStockId, setSelectedStockId] = useState<string | null>(stocks[0]?.id ?? null)
  const [editor, setEditor] = useState<AdminStockEditorData | null>(null)
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [pendingCreatedStock, setPendingCreatedStock] = useState<{ leagueId: string; ticker: string } | null>(null)
  const leagueNameById = useMemo(
    () => new Map(leagues.map((league) => [league.id, league.name])),
    [leagues],
  )

  useEffect(() => {
    if (!pendingCreatedStock) return
    const created = stocks.find((stock) => (
      stock.leagueId === pendingCreatedStock.leagueId
      && stock.ticker === pendingCreatedStock.ticker
    ))
    if (created) {
      setSelectedStockId(created.id)
      setPendingCreatedStock(null)
    }
  }, [pendingCreatedStock, stocks])

  useEffect(() => {
    if (selectedStockId && stocks.some(({ id }) => id === selectedStockId)) return
    setSelectedStockId(stocks[0]?.id ?? null)
  }, [selectedStockId, stocks])

  const reloadEditor = useCallback(async () => {
    if (!selectedStockId) {
      setEditor(null)
      return
    }

    setEditorLoading(true)
    setEditorError(null)
    try {
      setEditor(await loadAdminStockEditor(selectedStockId))
    } catch (error) {
      setEditor(null)
      setEditorError(error instanceof Error ? error.message : '종목 편집 정보를 불러오지 못했습니다.')
    } finally {
      setEditorLoading(false)
    }
  }, [selectedStockId])

  useEffect(() => {
    void reloadEditor()
  }, [reloadEditor])

  return (
    <section className="admin-panel admin-panel--stock">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><Building2 size={19} aria-hidden="true" /></span>
        <div><span className="eyebrow">STOCK</span><h2>종목 상장·라운드 계획</h2><p>관리자가 기본정보를 등록하고 라운드별 등락과 기사를 확정합니다.</p></div>
      </header>

      <div className="admin-stock-workspace">
        <aside className="admin-stock-list" aria-label="등록 종목">
          {stocks.length > 0 ? stocks.map((stock) => (
            <button
              type="button"
              key={stock.id}
              className={`admin-stock-row${stock.id === selectedStockId ? ' is-selected' : ''}`}
              onClick={() => setSelectedStockId(stock.id)}
            >
              <StockLogo src={stock.logoImageUrl} spriteIndex={stock.logoSpriteIndex} size="sm" label={`${stock.name} 로고`} />
              <span className="admin-stock-row__copy">
                <strong>{stock.name} <small>{stock.ticker}</small></strong>
                <span>{leagueNameById.get(stock.leagueId)} · 계획 {stock.completedPlanCount}/{stock.totalPlanCount}</span>
              </span>
              <span className={`admin-status admin-status--${stock.status}`}>
                {stock.activationRequestedAt && stock.status === 'pending'
                  ? `${stock.activationRoundNumber}R 예약`
                  : stockStatusLabel[stock.status] ?? stock.status}
              </span>
            </button>
          )) : <p className="admin-empty-copy">등록된 종목이 없습니다.</p>}
        </aside>

        <div className="admin-stock-workspace__editor">
          {editorLoading ? (
            <div className="admin-settlement__loading"><span className="brand-loader" /> 종목 계획을 불러오는 중입니다.</div>
          ) : editorError ? (
            <div className="admin-feedback is-error" role="alert">{editorError}</div>
          ) : editor ? (
            <StockEditor
              key={`${editor.stock.id}:${editor.stock.updatedAt}`}
              editor={editor}
              participants={participants}
              busy={busy}
              onRun={onRun}
              onReload={reloadEditor}
            />
          ) : (
            <p className="admin-empty-copy">왼쪽에서 편집할 종목을 선택해 주세요.</p>
          )}
        </div>
      </div>

      <DraftStockForm
        leagues={leagues}
        participants={participants}
        stocks={stocks}
        busy={busy}
        onRun={onRun}
        onCreated={(leagueId, ticker) => setPendingCreatedStock({ leagueId, ticker })}
      />
    </section>
  )
}
