import { CheckCircle2, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { useState } from 'react'
import { formatRp } from '../lib/format'
import { useMarket } from '../market/useMarket'

interface LeagueJoinCardProps {
  compact?: boolean
}

export function LeagueJoinCard({ compact = false }: LeagueJoinCardProps) {
  const { market, myState, joinCurrentLeague } = useMarket()
  const [joining, setJoining] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (myState?.joined) return null

  if (!market?.league) {
    return (
      <section className={`panel league-join-card${compact ? ' is-compact' : ''}`}>
        <ShieldCheck size={24} />
        <div>
          <span className="eyebrow">리그 준비 중</span>
          <h2>참가 가능한 리그가 아직 없습니다</h2>
          <p>운영자가 리그 일정을 열면 이 화면에서 바로 참가할 수 있습니다.</p>
        </div>
      </section>
    )
  }

  async function handleJoin() {
    setJoining(true)
    setMessage(null)
    try {
      await joinCurrentLeague()
    } catch (joinError) {
      setMessage(joinError instanceof Error ? joinError.message : '리그 참가에 실패했습니다.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <section className={`panel league-join-card${compact ? ' is-compact' : ''}`}>
      <span className="league-join-card__icon"><UserRoundPlus size={25} /></span>
      <div className="league-join-card__copy">
        <span className="eyebrow">한 계정당 한 번 참가</span>
        <h2>{market.league.name} 참가하기</h2>
        <p>리그 참가 시 {formatRp(market.league.initialBalance)}가 지급됩니다.</p>
        <div className="league-join-points">
          <span><CheckCircle2 size={14} /> 카카오 계정 기준 1인 1참가</span>
          <span><CheckCircle2 size={14} /> 익명 닉네임 자동 배정</span>
        </div>
        {message && <p className="form-message is-error" role="alert">{message}</p>}
      </div>
      <button className="action-button" type="button" onClick={() => void handleJoin()} disabled={joining}>
        {joining ? '참가 처리 중' : '리그 참가'}
      </button>
    </section>
  )
}
