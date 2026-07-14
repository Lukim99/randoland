import { Award, CalendarClock, EyeOff, Trophy } from 'lucide-react'
import { LeagueJoinCard } from '../components/LeagueJoinCard'
import { formatKstDateTime, formatPercent, formatRp, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type { LeagueAward } from '../types/market'

function formatAwardMetric(award: LeagueAward) {
  if (award.metricValue === null) return null

  if (award.code === 'short_term') {
    return `완료 매매 ${Math.trunc(award.metricValue)}회`
  }

  if (award.code === 'diamond_hands') {
    return `최장 보유 ${Math.trunc(award.metricValue)}라운드`
  }

  return `최종 수익률 ${formatPercent(award.metricValue)}`
}

export function RankingView() {
  const { market, myState, rankings } = useMarket()

  if (!market?.league) return <LeagueJoinCard compact />

  if (!rankings?.publishedAt || rankings.rankings.length === 0) {
    return (
      <section className="panel ranking-locked-card">
        <span><EyeOff size={27} /></span>
        <div>
          <span className="eyebrow">다음 공개까지 비공개</span>
          <h2>첫 주간 순위를 집계하고 있습니다</h2>
          <p>순위는 과도한 눈치 싸움을 막기 위해 매주 일요일 오전 9시에만 새 스냅샷으로 공개됩니다.</p>
        </div>
        <div className="ranking-schedule"><CalendarClock size={16} /><span>매주 일요일<strong>09:00 KST</strong></span></div>
      </section>
    )
  }

  const ownNickname = myState?.participant?.nickname

  return (
    <div className="feature-stack">
      <section className="panel ranking-summary">
        <div><Trophy size={24} /><span><small>{rankings.isFinal ? '최종 결과' : '공개 라운드'}</small><strong>{rankings.roundNumber}라운드</strong></span></div>
        <div><small>공개 시각</small><strong>{formatKstDateTime(rankings.publishedAt)}</strong></div>
        <div><small>참가자</small><strong>{rankings.rankings.length}명</strong></div>
      </section>
      {rankings.awards.length > 0 && (
        <section className="panel live-section award-section">
          <div className="section-heading section-heading--compact">
            <div><span className="eyebrow">리그 종료 결과</span><h2>수상자와 칭호</h2></div>
            <Trophy size={19} />
          </div>
          <div className="award-grid">
            {rankings.awards.map((award) => (
              <article className={`award-card award-card--${award.code}`} key={award.code}>
                <span className="award-card__icon"><Award size={18} /></span>
                <div>
                  <small>{award.label}</small>
                  <strong>{award.nickname}</strong>
                  {formatAwardMetric(award) && <span>{formatAwardMetric(award)}</span>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="panel live-section">
        <div className="section-heading section-heading--compact"><div><span className="eyebrow">{rankings.isFinal ? '최종 스냅샷' : '주간 스냅샷'}</span><h2>{rankings.isFinal ? '최종 순위' : '공개 순위'}</h2></div><Award size={19} /></div>
        <div className="ranking-list">
          {rankings.rankings.map((entry) => (
            <article className={`ranking-row${entry.nickname === ownNickname ? ' is-me' : ''}`} key={`${entry.rank}-${entry.nickname}`}>
              <span className={`rank-number rank-${Math.min(entry.rank, 4)}`}>{entry.rank}</span>
              <div><strong>{entry.nickname}</strong><small>매매 {entry.completedTradeCycles}회 · 최장 보유 {entry.longestHoldingRounds}라운드</small></div>
              <span><small>총 자산</small><strong>{formatRp(entry.netWorth)}</strong></span>
              <span className={movementClass(entry.returnPercent)}><small>수익률</small><strong>{formatPercent(entry.returnPercent)}</strong></span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
