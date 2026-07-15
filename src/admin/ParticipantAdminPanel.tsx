import { Search, ShieldBan, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { disqualifyAdminParticipant, revokeAdminBan } from '../services/admin'
import type { AdminActionRunner, AdminLeague, AdminParticipant } from '../types/admin'
import { formatPrice } from '../lib/format'

interface ParticipantAdminPanelProps {
  leagues: AdminLeague[]
  participants: AdminParticipant[]
  busy: boolean
  onRun: AdminActionRunner
}

export function ParticipantAdminPanel({ leagues, participants, busy, onRun }: ParticipantAdminPanelProps) {
  const [query, setQuery] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [reason, setReason] = useState('')
  const [banFuture, setBanFuture] = useState(true)
  const selectedParticipantId = participants.some(({ id }) => id === participantId)
    ? participantId
    : participants[0]?.id ?? ''
  const selectedParticipant = participants.find(({ id }) => id === selectedParticipantId)
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const visibleParticipants = participants.filter((participant) => !normalizedQuery || participant.nickname.toLocaleLowerCase('ko-KR').includes(normalizedQuery))
  const leagueNameById = new Map(leagues.map((league) => [league.id, league.name]))

  async function handleDisqualify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedParticipant) return
    if (!window.confirm(`${selectedParticipant.nickname} 참가자를 제재하시겠습니까? 대기 주문이 모두 거절됩니다.`)) return
    const completed = await onRun(
      () => disqualifyAdminParticipant(selectedParticipant.id, reason, banFuture),
      `${selectedParticipant.nickname} 참가자를 제재했습니다.`,
    )
    if (completed) setReason('')
  }

  async function handleRevokeBan() {
    if (!selectedParticipant?.activeBan) return
    const completed = await onRun(
      () => revokeAdminBan(selectedParticipant.userId, reason),
      `${selectedParticipant.nickname} 계정의 이후 리그 참가 제한을 해제했습니다.`,
    )
    if (completed) setReason('')
  }

  return (
    <section className="admin-panel admin-panel--participant">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><ShieldBan size={19} aria-hidden="true" /></span>
        <div><span className="eyebrow">PARTICIPANT</span><h2>사용자 제재</h2></div>
      </header>

      <div className="admin-search">
        <Search size={16} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="닉네임 검색" aria-label="참가자 닉네임 검색" />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>참가자</th><th>리그</th><th>보유 RP</th><th>상태</th></tr></thead>
          <tbody>{visibleParticipants.map((participant) => (
            <tr key={participant.id}>
              <td>{participant.nickname}</td>
              <td>{leagueNameById.get(participant.leagueId) ?? '알 수 없음'}</td>
              <td>{formatPrice(participant.cashBalance)}</td>
              <td><span className={`admin-status${participant.disqualifiedAt ? ' admin-status--archived' : participant.activeBan ? ' admin-status--warning' : ' admin-status--active'}`}>{participant.disqualifiedAt ? '리그 제재' : participant.activeBan ? '이후 참가 제한' : '정상'}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <form className="admin-form admin-form--danger" onSubmit={(event) => void handleDisqualify(event)}>
        <label><span>제재 대상</span><select value={selectedParticipantId} onChange={(event) => setParticipantId(event.target.value)} disabled={participants.length === 0}>{participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.nickname} · {leagueNameById.get(participant.leagueId)}{participant.disqualifiedAt ? ' · 제재됨' : ''}</option>)}</select></label>
        <label><span>제재 사유</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} rows={3} required /></label>
        <label className="admin-check"><input type="checkbox" checked={banFuture} onChange={(event) => setBanFuture(event.target.checked)} /><span>이후 리그 참가도 제한</span></label>
        <div className="admin-form__actions">
          <button className="danger-button" type="submit" disabled={busy || !selectedParticipantId || Boolean(selectedParticipant?.disqualifiedAt)}>참가자 제재</button>
          {selectedParticipant?.activeBan && (
            <button className="secondary-button" type="button" onClick={() => void handleRevokeBan()} disabled={busy || reason.trim().length < 5}>
              <ShieldCheck size={15} aria-hidden="true" /> 이후 참가 제한 해제
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
