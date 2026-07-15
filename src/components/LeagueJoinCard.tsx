import { CheckCircle2, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { useState } from 'react'
import { useMarket } from '../market/useMarket'

interface LeagueJoinCardProps {
  compact?: boolean
}

export function LeagueJoinCard({ compact = false }: LeagueJoinCardProps) {
  const { market, myState, joinCurrentLeague } = useMarket()
  const [nickname, setNickname] = useState('')
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
    const normalizedNickname = nickname.trim().normalize('NFC')
    const isKoreanNickname = /^[가-힣]{1,8}$/.test(normalizedNickname)
    const isEnglishOrNumberNickname = /^[A-Za-z0-9]{1,16}$/.test(normalizedNickname)

    if (!isKoreanNickname && !isEnglishOrNumberNickname) {
      setMessage('닉네임은 한글 8자 이하 또는 영문·숫자 16자 이하로 입력해 주세요.')
      return
    }

    setJoining(true)
    setMessage(null)
    try {
      await joinCurrentLeague(normalizedNickname)
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
        <p>리그 참가 시 1,000,000 RP가 지급됩니다.</p>
        <label className="join-nickname-field" htmlFor="league-nickname">
          <span>닉네임</span>
          <input
            id="league-nickname"
            type="text"
            value={nickname}
            maxLength={16}
            autoComplete="off"
            placeholder="사용할 닉네임"
            onChange={(event) => setNickname(event.target.value)}
          />
          <small>한글 8자 이하 또는 영문·숫자 16자 이하</small>
        </label>
        <div className="league-join-points">
          <span><CheckCircle2 size={14} /> 카카오 계정 기준 1인 1참가</span>
          <span><CheckCircle2 size={14} /> 참가 후 닉네임 변경 불가</span>
        </div>
        {message && <p className="form-message is-error" role="alert">{message}</p>}
      </div>
      <button className="action-button" type="button" onClick={() => void handleJoin()} disabled={joining || nickname.trim().length === 0}>
        {joining ? '참가 처리 중' : '리그 참가'}
      </button>
    </section>
  )
}
