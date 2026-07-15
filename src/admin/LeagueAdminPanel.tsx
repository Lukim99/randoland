import { CalendarPlus, OctagonX } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { createAdminLeague, stopAdminLeague } from '../services/admin'
import type { AdminActionRunner, AdminLeague } from '../types/admin'
import { formatKstDateTime } from '../lib/format'

interface LeagueAdminPanelProps {
  leagues: AdminLeague[]
  busy: boolean
  onRun: AdminActionRunner
}

function kstDateOffset(days: number) {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

export function LeagueAdminPanel({ leagues, busy, onRun }: LeagueAdminPanelProps) {
  const operatingLeagues = leagues.filter(({ status }) => status === 'registration' || status === 'active')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [startsOn, setStartsOn] = useState(() => kstDateOffset(1))
  const [endsOn, setEndsOn] = useState(() => kstDateOffset(31))
  const [stopLeagueId, setStopLeagueId] = useState('')
  const [stopReason, setStopReason] = useState('')
  const selectedStopLeagueId = operatingLeagues.some(({ id }) => id === stopLeagueId)
    ? stopLeagueId
    : operatingLeagues[0]?.id ?? ''

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const completed = await onRun(
      () => createAdminLeague({ name, slug, startsOn, endsOn }),
      '새 리그를 개최했습니다.',
    )
    if (completed) {
      setName('')
      setSlug('')
    }
  }

  async function handleStop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedStopLeagueId) return
    const target = operatingLeagues.find(({ id }) => id === selectedStopLeagueId)
    if (!window.confirm(`${target?.name ?? '선택한 리그'}를 중단하시겠습니까? 대기 주문은 모두 거절됩니다.`)) return

    const completed = await onRun(
      () => stopAdminLeague(selectedStopLeagueId, stopReason),
      '리그를 중단하고 대기 주문을 정리했습니다.',
    )
    if (completed) setStopReason('')
  }

  return (
    <section className="admin-panel admin-panel--league">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><CalendarPlus size={19} aria-hidden="true" /></span>
        <div><span className="eyebrow">LEAGUE</span><h2>리그 개최·중단</h2></div>
      </header>

      <div className="admin-current-list">
        {leagues.length === 0 ? <p className="admin-empty-copy">등록된 리그가 없습니다.</p> : leagues.map((league) => (
          <article key={league.id} className="admin-current-row">
            <div>
              <strong>{league.name}</strong>
              <span>{league.startsAt ? formatKstDateTime(league.startsAt) : '일정 미정'} · 참가자 {league.participantCount}명</span>
            </div>
            <span className={`admin-status admin-status--${league.status}`}>{league.status === 'active' ? '운영 중' : league.status === 'registration' ? '접수 중' : league.status === 'finished' ? '종료' : league.status === 'archived' ? '중단' : '준비'}</span>
          </article>
        ))}
      </div>

      <form className="admin-form" onSubmit={(event) => void handleCreate(event)}>
        <h3>새 리그 개최</h3>
        <div className="admin-form__columns">
          <label><span>리그명</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required /></label>
          <label><span>주소 식별자</span><input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} pattern="[a-z0-9][a-z0-9-]{1,48}[a-z0-9]" placeholder="season-2" required /></label>
          <label><span>시작일</span><input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required /></label>
          <label><span>종료일</span><input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required /></label>
        </div>
        <p className="admin-form__hint">모든 일정은 KST 오전 9시 기준이며, 운영 중인 리그가 있으면 새 리그를 열 수 없습니다.</p>
        <button className="primary-button" type="submit" disabled={busy || operatingLeagues.length > 0}>리그 개최</button>
      </form>

      <form className="admin-form admin-form--danger" onSubmit={(event) => void handleStop(event)}>
        <h3><OctagonX size={16} aria-hidden="true" /> 리그 중단</h3>
        <label><span>대상 리그</span><select value={selectedStopLeagueId} onChange={(event) => setStopLeagueId(event.target.value)} disabled={operatingLeagues.length === 0}>{operatingLeagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></label>
        <label><span>중단 사유</span><textarea value={stopReason} onChange={(event) => setStopReason(event.target.value)} minLength={5} maxLength={500} rows={3} required /></label>
        <p className="admin-form__hint">리그는 보존 상태로 전환되며 복구되지 않습니다. 정산 중에는 중단할 수 없습니다.</p>
        <button className="danger-button" type="submit" disabled={busy || !selectedStopLeagueId}>리그 중단</button>
      </form>
    </section>
  )
}
