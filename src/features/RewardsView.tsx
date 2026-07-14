import { CalendarCheck2, CircleDot, Clock3, Coins, Route, TicketCheck, Zap } from 'lucide-react'
import { useState } from 'react'
import { formatKstDateTime, formatRp } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type { LadderResult } from '../types/market'
import { ParticipantGate } from './ParticipantGate'

const rewards = [20_000, 50_000, 100_000]

export function RewardsView() {
  const { myState, claimAttendance, playLadder } = useMarket()
  const participant = myState?.participant
  const [attendanceBusy, setAttendanceBusy] = useState(false)
  const [gameBusy, setGameBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<LadderResult | null>(null)

  async function handleAttendance() {
    setAttendanceBusy(true)
    setMessage(null)
    try {
      const result = await claimAttendance()
      setMessage(result.awarded ? '오늘의 출석 토큰 1개를 받았습니다.' : '오늘 출석은 이미 완료했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '출석 처리에 실패했습니다.')
    } finally {
      setAttendanceBusy(false)
    }
  }

  async function handleGame(choice: 'odd' | 'even') {
    setGameBusy(true)
    setMessage(null)
    try {
      const result = await playLadder(choice)
      setLastResult(result)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '홀짝 사다리 진행에 실패했습니다.')
    } finally {
      setGameBusy(false)
    }
  }

  return (
    <ParticipantGate>
      {participant && myState && (
        <div className="feature-stack">
          <section className="panel attendance-card">
            <span className="attendance-card__icon"><CalendarCheck2 size={25} /></span>
            <div><span className="eyebrow">KST 기준 하루 한 번</span><h2>오늘의 출석</h2><p>출석을 완료하면 홀짝 사다리에 사용할 토큰 1개를 받습니다.</p></div>
            <div className="token-balance"><TicketCheck size={17} /><span><small>보유 토큰</small><strong>{participant.attendanceTokens}개</strong></span></div>
            <button className="action-button" type="button" disabled={participant.attendedToday || attendanceBusy} onClick={() => void handleAttendance()}>
              {participant.attendedToday ? '오늘 출석 완료' : attendanceBusy ? '처리 중' : '출석 토큰 받기'}
            </button>
          </section>

          <section className="panel ladder-card">
            <div className="section-heading section-heading--compact"><div><span className="eyebrow">토큰 1개 사용</span><h2>홀짝 사다리</h2></div><Route size={20} /></div>
            <div className="reward-steps">
              {rewards.map((reward, index) => (
                <div className={participant.ladderStreak === index ? 'is-next' : ''} key={reward}>
                  <span>{index + 1}연승</span><strong>{formatRp(reward)}</strong>
                </div>
              ))}
            </div>
            <p className="ladder-description">승리할 때마다 보상이 커지고 3연승 후에는 다시 1단계부터 시작합니다. 패배하면 연승이 초기화됩니다.</p>
            <div className="ladder-choices">
              <button type="button" disabled={gameBusy || participant.attendanceTokens < 1} onClick={() => void handleGame('odd')}><CircleDot size={20} /><span>홀</span><small>홀수 선택</small></button>
              <button type="button" disabled={gameBusy || participant.attendanceTokens < 1} onClick={() => void handleGame('even')}><CircleDot size={20} /><span>짝</span><small>짝수 선택</small></button>
            </div>
            {lastResult && (
              <div className={`ladder-result${lastResult.won ? ' is-win' : ' is-loss'}`} role="status">
                <Zap size={19} />
                <span><strong>{lastResult.won ? '적중' : '아쉽게 빗나갔습니다'}</strong><small>결과 {lastResult.result === 'odd' ? '홀' : '짝'} · {lastResult.won ? `${formatRp(lastResult.reward)} 지급` : '연승 초기화'}</small></span>
              </div>
            )}
            {message && <p className="form-message" role="status">{message}</p>}
          </section>

          <section className="panel leverage-guide">
            <div><Coins size={21} /><span><span className="eyebrow">주문 선택지</span><h2>레버리지 정산 기준</h2></span></div>
            <ul>
              <li><strong>최대 50%</strong><span>자기자금 대비 원하는 비율만큼 매수 주문에 사용합니다.</span></li>
              <li><strong>5% 차감</strong><span>매도 시 레버리지로 산 부분의 당시 평가액에서 5%를 차감합니다.</span></li>
              <li><strong>2라운드</strong><span>레버리지 포지션은 보유 2라운드가 되면 변동 전 가격으로 자동 청산됩니다.</span></li>
            </ul>
          </section>

          <section className="panel live-section">
            <div className="section-heading section-heading--compact"><div><span className="eyebrow">최근 기록</span><h2>홀짝 결과</h2></div><Clock3 size={18} /></div>
            {myState.ladderGames.length > 0 ? (
              <div className="compact-history">
                {myState.ladderGames.map((game) => (
                  <div key={game.id}>
                    <span><strong>{game.choice === 'odd' ? '홀' : '짝'} 선택 · 결과 {game.result === 'odd' ? '홀' : '짝'}</strong><small>{formatKstDateTime(game.playedAt)} · {game.streakAfter}연승</small></span>
                    <span className={game.won ? 'is-up' : 'is-down'}>{game.won ? `+${formatRp(game.reward)}` : '미적중'}</span>
                  </div>
                ))}
              </div>
            ) : <p className="muted-empty">아직 홀짝 사다리 기록이 없습니다.</p>}
          </section>
        </div>
      )}
    </ParticipantGate>
  )
}
