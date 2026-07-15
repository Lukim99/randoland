import {
  CalendarCheck2,
  CircleDot,
  Clock3,
  Coins,
  Flag,
  Route,
  TicketCheck,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { formatKstDateTime, formatRp } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type { LadderChoice, LadderGame, LadderResult } from '../types/market'
import { ParticipantGate } from './ParticipantGate'

const choiceLabel: Record<LadderChoice, string> = { odd: '홀', even: '짝' }

function outcomeCopy(game: LadderGame | LadderResult) {
  switch (game.outcome) {
    case 'first_loss':
      return { title: '1차 미적중', detail: `결과 ${choiceLabel[game.firstResult]} · 보상 0 RP`, won: false }
    case 'stopped':
      return { title: 'Stop 완료', detail: `${formatRp(game.reward)} 지급`, won: true }
    case 'second_win':
      return { title: 'Go 성공', detail: `2차 결과 ${game.secondResult ? choiceLabel[game.secondResult] : '-'} · ${formatRp(game.reward)} 지급`, won: true }
    case 'second_loss':
      return { title: 'Go 실패', detail: `2차 결과 ${game.secondResult ? choiceLabel[game.secondResult] : '-'} · 보상 0 RP`, won: false }
    default:
      return { title: '게임 완료', detail: game.reward > 0 ? `${formatRp(game.reward)} 지급` : '보상 0 RP', won: game.reward > 0 }
  }
}

export function RewardsView() {
  const {
    myState,
    claimAttendance,
    playLadder,
    chooseLadderAction,
    playLadderSecond,
  } = useMarket()
  const participant = myState?.participant
  const [attendanceBusy, setAttendanceBusy] = useState(false)
  const [gameBusy, setGameBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<LadderResult | null>(null)
  const activeGame = myState?.activeLadderGame ?? null
  const visibleGame = activeGame ?? lastResult

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

  async function handleFirstChoice(choice: LadderChoice) {
    setGameBusy(true)
    setMessage(null)
    try {
      setLastResult(await playLadder(choice))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '홀짝 게임을 시작하지 못했습니다.')
    } finally {
      setGameBusy(false)
    }
  }

  async function handleDecision(action: 'go' | 'stop') {
    if (!visibleGame) return
    setGameBusy(true)
    setMessage(null)
    try {
      setLastResult(await chooseLadderAction(visibleGame.id, action))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Go or Stop 선택을 처리하지 못했습니다.')
    } finally {
      setGameBusy(false)
    }
  }

  async function handleSecondChoice(choice: LadderChoice) {
    if (!visibleGame) return
    setGameBusy(true)
    setMessage(null)
    try {
      setLastResult(await playLadderSecond(visibleGame.id, choice))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '두 번째 홀짝 결과를 처리하지 못했습니다.')
    } finally {
      setGameBusy(false)
    }
  }

  const completedCopy = visibleGame?.state === 'completed' ? outcomeCopy(visibleGame) : null

  return (
    <ParticipantGate>
      {participant && myState && (
        <div className="feature-stack">
          <section className="panel attendance-card">
            <span className="attendance-card__icon"><CalendarCheck2 size={25} /></span>
            <div><span className="eyebrow">매일 한 번</span><h2>오늘의 출석</h2><p>출석하면 홀짝 게임 토큰 1개를 받습니다.</p></div>
            <div className="token-balance"><TicketCheck size={17} /><span><small>보유 토큰</small><strong>{participant.attendanceTokens}개</strong></span></div>
            <button className="action-button" type="button" disabled={participant.attendedToday || attendanceBusy} onClick={() => void handleAttendance()}>
              {participant.attendedToday ? '오늘 출석 완료' : attendanceBusy ? '처리 중' : '출석 토큰 받기'}
            </button>
          </section>

          <section className="panel ladder-card">
            <div className="section-heading section-heading--compact">
              <div><span className="eyebrow">토큰 1개</span><h2>홀짝 Go or Stop</h2></div>
              <Route size={20} />
            </div>

            <div className="reward-steps reward-steps--go-stop">
              <div className={!visibleGame ? 'is-next' : ''}>
                <span>Stop</span><strong>{formatRp(20_000)}</strong><small>1차 성공 후 확정</small>
              </div>
              <div className={visibleGame?.state === 'awaiting_second_pick' ? 'is-next' : ''}>
                <span>Go</span><strong>{formatRp(50_000)}</strong><small>2연속 성공 시 확정</small>
              </div>
            </div>

            {!visibleGame && (
              <>
                <p className="ladder-description">첫 결과를 맞히면 20,000 RP를 받거나, 보상을 걸고 50,000 RP에 도전할 수 있습니다.</p>
                <div className="ladder-choices" role="group" aria-label="첫 번째 홀짝 선택">
                  <button type="button" disabled={gameBusy || participant.attendanceTokens < 1} onClick={() => void handleFirstChoice('odd')}><CircleDot size={20} /><span>홀</span><small>1차 선택</small></button>
                  <button type="button" disabled={gameBusy || participant.attendanceTokens < 1} onClick={() => void handleFirstChoice('even')}><CircleDot size={20} /><span>짝</span><small>1차 선택</small></button>
                </div>
                {participant.attendanceTokens < 1 && <p className="ladder-token-note">출석 토큰이 필요합니다.</p>}
              </>
            )}

            {visibleGame?.state === 'awaiting_decision' && (
              <div className="ladder-stage" role="status">
                <div className="ladder-stage__status"><Zap size={19} /><span><strong>1차 적중</strong><small>결과 {choiceLabel[visibleGame.firstResult]}</small></span></div>
                <p>지금 보상을 확정하거나 두 번째 홀짝에 도전하세요.</p>
                <div className="go-stop-actions">
                  <button className="stop" type="button" disabled={gameBusy} onClick={() => void handleDecision('stop')}><Flag size={18} /><span><strong>Stop</strong><small>20,000 RP 받기</small></span></button>
                  <button className="go" type="button" disabled={gameBusy} onClick={() => void handleDecision('go')}><TrendingUp size={18} /><span><strong>Go</strong><small>50,000 RP 도전</small></span></button>
                </div>
              </div>
            )}

            {visibleGame?.state === 'awaiting_second_pick' && (
              <div className="ladder-stage" role="status">
                <div className="ladder-stage__status"><TrendingUp size={19} /><span><strong>Go 선택</strong><small>한 번 더 맞히면 50,000 RP</small></span></div>
                <div className="ladder-choices" role="group" aria-label="두 번째 홀짝 선택">
                  <button type="button" disabled={gameBusy} onClick={() => void handleSecondChoice('odd')}><CircleDot size={20} /><span>홀</span><small>2차 선택</small></button>
                  <button type="button" disabled={gameBusy} onClick={() => void handleSecondChoice('even')}><CircleDot size={20} /><span>짝</span><small>2차 선택</small></button>
                </div>
              </div>
            )}

            {visibleGame?.state === 'completed' && completedCopy && (
              <div className={`ladder-result${completedCopy.won ? ' is-win' : ' is-loss'}`} role="status">
                <Zap size={19} />
                <span><strong>{completedCopy.title}</strong><small>{completedCopy.detail}</small></span>
                {participant.attendanceTokens > 0 && (
                  <button type="button" onClick={() => setLastResult(null)}>새 게임</button>
                )}
              </div>
            )}
            {message && <p className="form-message" role="status">{message}</p>}
          </section>

          <section className="panel leverage-guide">
            <div><Coins size={21} /><span><span className="eyebrow">주문 선택지</span><h2>레버리지 정산 기준</h2></span></div>
            <ul>
              <li><strong>최대 50%</strong><span>순자산을 기준으로 매수 주문에 사용할 수 있습니다.</span></li>
              <li><strong>5% 차감</strong><span>레버리지 매수분의 매도 시점 평가액에서 차감합니다.</span></li>
              <li><strong>2라운드 경과</strong><span>보유 후 2라운드가 지나면 이후 변동된 가격으로 자동 청산됩니다.</span></li>
            </ul>
          </section>

          <section className="panel live-section">
            <div className="section-heading section-heading--compact"><div><span className="eyebrow">완료된 게임</span><h2>홀짝 결과</h2></div><Clock3 size={18} /></div>
            {myState.ladderGames.length > 0 ? (
              <div className="compact-history">
                {myState.ladderGames.map((game) => {
                  const copy = outcomeCopy(game)
                  return (
                    <div key={game.id}>
                      <span><strong>{copy.title}</strong><small>{formatKstDateTime(game.completedAt ?? game.playedAt)} · 1차 {choiceLabel[game.firstChoice]}</small></span>
                      <span className={copy.won ? 'is-up' : 'is-down'}>{game.reward > 0 ? `+${formatRp(game.reward)}` : '0 RP'}</span>
                    </div>
                  )
                })}
              </div>
            ) : <p className="muted-empty">완료된 홀짝 게임이 없습니다.</p>}
          </section>
        </div>
      )}
    </ParticipantGate>
  )
}
