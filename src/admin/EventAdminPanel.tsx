import { Globe2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { upsertAdminGlobalEvent } from '../services/admin'
import type { AdminActionRunner, AdminGlobalEvent, AdminLeague } from '../types/admin'

interface EventAdminPanelProps {
  leagues: AdminLeague[]
  events: AdminGlobalEvent[]
  busy: boolean
  onRun: AdminActionRunner
}

export function EventAdminPanel({ leagues, events, busy, onRun }: EventAdminPanelProps) {
  const availableLeagues = leagues.filter(({ status }) => status !== 'archived')
  const [leagueId, setLeagueId] = useState('')
  const [weekNumber, setWeekNumber] = useState(1)
  const [title, setTitle] = useState('')
  const [scenario, setScenario] = useState('')
  const [intensity, setIntensity] = useState(0.7)
  const [isActive, setIsActive] = useState(true)
  const selectedLeagueId = availableLeagues.some(({ id }) => id === leagueId)
    ? leagueId
    : availableLeagues[0]?.id ?? ''

  useEffect(() => {
    const existing = events.find((event) => event.leagueId === selectedLeagueId && event.weekNumber === weekNumber)
    setTitle(existing?.title ?? '')
    setScenario(existing?.scenario ?? '')
    setIntensity(existing?.intensity ?? 0.7)
    setIsActive(existing?.isActive ?? true)
  }, [events, selectedLeagueId, weekNumber])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedLeagueId) return
    await onRun(
      () => upsertAdminGlobalEvent({ leagueId: selectedLeagueId, weekNumber, title, scenario, intensity, isActive }),
      `${weekNumber}주차 글로벌 이벤트를 저장했습니다.`,
    )
  }

  return (
    <section className="admin-panel admin-panel--event">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><Globe2 size={19} aria-hidden="true" /></span>
        <div><span className="eyebrow">GLOBAL EVENT</span><h2>글로벌 이벤트</h2></div>
      </header>

      <form className="admin-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="admin-form__columns">
          <label><span>리그</span><select value={selectedLeagueId} onChange={(event) => setLeagueId(event.target.value)} disabled={availableLeagues.length === 0}>{availableLeagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></label>
          <label><span>적용 주차</span><select value={weekNumber} onChange={(event) => setWeekNumber(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((week) => <option key={week} value={week}>{week}주차</option>)}</select></label>
        </div>
        <label><span>이벤트 제목</span><input value={title} onChange={(event) => setTitle(event.target.value)} minLength={5} maxLength={140} required /></label>
        <label><span>시나리오</span><textarea value={scenario} onChange={(event) => setScenario(event.target.value)} minLength={20} maxLength={6000} rows={8} placeholder="시장 전체에 영향을 주는 사건과 산업별 파급 경로를 구체적으로 입력합니다." required /></label>
        <label className="admin-range-label"><span>영향 강도 <strong>{Math.round(intensity * 100)}%</strong></span><input type="range" min="0" max="1" step="0.05" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} /></label>
        <label className="admin-check"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><span>정산과 뉴스 생성에 반영</span></label>
        <p className="admin-form__hint">같은 리그·주차의 기존 이벤트가 있으면 입력 내용으로 갱신됩니다.</p>
        <button className="primary-button" type="submit" disabled={busy || !selectedLeagueId}>이벤트 저장</button>
      </form>
    </section>
  )
}
