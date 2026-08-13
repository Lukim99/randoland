import { CheckCircle2, LockKeyhole, Newspaper, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  loadAdminGlobalNewsEditor,
  saveAdminGlobalNewsPlans,
} from '../services/admin'
import type {
  AdminActionRunner,
  AdminGlobalNewsEditor,
  AdminGlobalNewsRoundPlan,
  AdminLeague,
} from '../types/admin'

interface GlobalNewsAdminPanelProps {
  leagues: AdminLeague[]
  busy: boolean
  onRun: AdminActionRunner
}

const roundStatusLabels: Record<string, string> = {
  scheduled: '예정',
  open: '진행 중',
  locked: '잠김',
  settling: '정산 중',
  settled: '정산 완료',
  failed: '복구 대기',
}

function initialLeagueId(leagues: AdminLeague[]) {
  return leagues.find(({ status }) => status === 'active')?.id
    ?? leagues.find(({ status }) => status === 'registration')?.id
    ?? leagues.find(({ status }) => status !== 'archived')?.id
    ?? ''
}

function validatePlans(plans: AdminGlobalNewsRoundPlan[]) {
  for (const plan of plans) {
    const headline = plan.headline?.trim() ?? ''
    const body = plan.body?.trim() ?? ''
    const fieldCount = [headline, body].filter(Boolean).length

    if (fieldCount === 0) continue
    if (fieldCount !== 2) {
      return `${plan.roundNumber}라운드의 제목과 기사를 모두 입력해 주세요.`
    }
    if (headline.length < 10 || headline.length > 140) {
      return `${plan.roundNumber}라운드 제목은 10~140자로 입력해 주세요.`
    }
    if (body.length < 100 || body.length > 6000) {
      return `${plan.roundNumber}라운드 기사는 100~6,000자로 입력해 주세요.`
    }
  }

  return null
}

export function GlobalNewsAdminPanel({ leagues, busy, onRun }: GlobalNewsAdminPanelProps) {
  const availableLeagues = useMemo(
    () => leagues.filter(({ status, startsAt, endsAt }) => status !== 'archived' && startsAt && endsAt),
    [leagues],
  )
  const [leagueId, setLeagueId] = useState(() => initialLeagueId(availableLeagues))
  const [editor, setEditor] = useState<AdminGlobalNewsEditor | null>(null)
  const [plans, setPlans] = useState<AdminGlobalNewsRoundPlan[]>([])
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (availableLeagues.some((league) => league.id === leagueId)) return
    setLeagueId(initialLeagueId(availableLeagues))
  }, [availableLeagues, leagueId])

  const refreshEditor = useCallback(async () => {
    if (!leagueId) {
      setEditor(null)
      setPlans([])
      return
    }

    setLoading(true)
    setLocalError(null)
    try {
      const nextEditor = await loadAdminGlobalNewsEditor(leagueId)
      setEditor(nextEditor)
      setPlans(nextEditor.plans)
      setSelectedRoundNumber((current) => {
        if (current && nextEditor.plans.some((plan) => plan.roundNumber === current)) return current
        return nextEditor.currentRoundNumber
          ?? nextEditor.plans.find((plan) => plan.editable && !plan.complete)?.roundNumber
          ?? nextEditor.plans[0]?.roundNumber
          ?? null
      })
    } catch (error) {
      setEditor(null)
      setPlans([])
      setLocalError(error instanceof Error ? error.message : '글로벌 뉴스 계획을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    void refreshEditor()
  }, [refreshEditor])

  const selectedPlan = plans.find(({ roundNumber }) => roundNumber === selectedRoundNumber) ?? null
  const completeCount = plans.filter(({ complete }) => complete).length

  function updateSelectedPlan(
    field: 'headline' | 'body',
    value: string,
  ) {
    if (!selectedPlan?.editable) return
    setPlans((current) => current.map((plan) => (
      plan.roundNumber === selectedPlan.roundNumber
        ? {
          ...plan,
          [field]: value,
          complete: Boolean(
            (field === 'headline' ? value : plan.headline)?.trim()
            && (field === 'body' ? value : plan.body)?.trim(),
          ),
        }
        : plan
    )))
  }

  async function handleSave() {
    if (!editor) return

    const validationError = validatePlans(plans)
    if (validationError) {
      setLocalError(validationError)
      return
    }

    setSaving(true)
    setLocalError(null)
    try {
      const completed = await onRun(
        () => saveAdminGlobalNewsPlans(editor.league.id, plans),
        '글로벌 뉴스 라운드 계획을 저장했습니다.',
      )
      if (completed) await refreshEditor()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-panel admin-panel--global-news">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><Newspaper size={19} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">GLOBAL NEWS PLAN</span>
          <h2>글로벌 뉴스 설정</h2>
          <p>라운드마다 공개할 제목과 기사를 직접 입력합니다. 정산 시 저장된 원문 그대로 발행됩니다.</p>
        </div>
      </header>

      <div className="admin-global-news__toolbar">
        <label>
          <span>리그</span>
          <select value={leagueId} onChange={(event) => setLeagueId(event.target.value)} disabled={busy || loading}>
            {availableLeagues.length === 0 && <option value="">설정 가능한 리그 없음</option>}
            {availableLeagues.map((league) => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>
        </label>
        <div className="admin-global-news__progress" aria-live="polite">
          <span>입력 완료</span>
          <strong>{completeCount} / {plans.length}</strong>
        </div>
      </div>

      {localError && <div className="admin-feedback is-error" role="alert">{localError}</div>}

      {loading ? (
        <div className="admin-global-news__loading" aria-live="polite">
          <span className="brand-loader" /> 글로벌 뉴스 계획을 불러오는 중입니다.
        </div>
      ) : selectedPlan ? (
        <>
          <nav className="admin-global-news__rounds" aria-label="글로벌 뉴스 라운드 선택">
            {plans.map((plan) => (
              <button
                key={plan.roundNumber}
                className={`${plan.roundNumber === selectedPlan.roundNumber ? 'is-active' : ''}${plan.complete ? ' is-complete' : ''}`}
                type="button"
                onClick={() => setSelectedRoundNumber(plan.roundNumber)}
              >
                {plan.roundNumber}R
              </button>
            ))}
          </nav>

          <div className="admin-global-news__round-heading">
            <div>
              <span className="eyebrow">ROUND {selectedPlan.roundNumber}</span>
              <h3>{selectedPlan.roundNumber}라운드 글로벌 뉴스</h3>
            </div>
            <span className={`admin-global-news__status${selectedPlan.complete ? ' is-complete' : ''}`}>
              {selectedPlan.editable
                ? selectedPlan.complete ? <><CheckCircle2 size={14} aria-hidden="true" /> 입력 완료</> : '입력 필요'
                : <><LockKeyhole size={14} aria-hidden="true" /> {roundStatusLabels[selectedPlan.roundStatus ?? ''] ?? '수정 불가'}</>}
            </span>
          </div>

          <div className="admin-global-news__form">
            <label>
              <span>제목 <small>{selectedPlan.headline?.trim().length ?? 0} / 140</small></span>
              <input
                value={selectedPlan.headline ?? ''}
                onChange={(event) => updateSelectedPlan('headline', event.target.value)}
                minLength={10}
                maxLength={140}
                disabled={!selectedPlan.editable || busy}
                placeholder="시장 전체 흐름을 보여주는 제목"
              />
            </label>
            <label>
              <span>기사 <small>{selectedPlan.body?.trim().length ?? 0} / 6,000</small></span>
              <textarea
                value={selectedPlan.body ?? ''}
                onChange={(event) => updateSelectedPlan('body', event.target.value)}
                minLength={100}
                maxLength={6000}
                rows={10}
                disabled={!selectedPlan.editable || busy}
                placeholder="라운드 정산 후 그대로 공개할 글로벌 뉴스 기사"
              />
            </label>
          </div>

          <div className="admin-global-news__actions">
            <p>현재 또는 미래 라운드는 저장할 수 있으며, 정산이 시작되면 원문이 잠깁니다.</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => void handleSave()}
              disabled={busy || saving || !plans.some(({ editable }) => editable)}
            >
              <Save size={15} aria-hidden="true" />
              {saving ? '저장 중' : '전체 라운드 저장'}
            </button>
          </div>
        </>
      ) : (
        <p className="admin-empty-copy">글로벌 뉴스를 설정할 라운드가 없습니다.</p>
      )}
    </section>
  )
}
