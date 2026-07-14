import { Activity, Banknote, Clock3, Scale, WalletCards } from 'lucide-react'
import { formatPercent, formatPrice, formatRp, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'
import { ParticipantGate } from './ParticipantGate'

const ledgerLabels: Record<string, string> = {
  initial_balance: '초기 자금',
  buy: '매수',
  sell: '매도',
  leverage_borrow: '레버리지 사용',
  leverage_repayment: '레버리지 상환',
  leverage_fee: '레버리지 차감',
  ladder_reward: '홀짝 보상',
  admin_adjustment: '운영 조정',
}

export function PortfolioView() {
  const { myState } = useMarket()
  const participant = myState?.participant

  return (
    <ParticipantGate>
      {participant && myState && (
        <div className="feature-stack">
          <section className="feature-metrics">
            <article className="panel"><WalletCards size={18} /><small>총 보유자산</small><strong>{formatRp(participant.netWorth)}</strong></article>
            <article className="panel"><Banknote size={18} /><small>주문 가능 RP</small><strong>{formatRp(participant.availableCash)}</strong></article>
            <article className="panel"><Scale size={18} /><small>레버리지 부채·예상 차감</small><strong>{formatRp(participant.projectedLiabilities)}</strong></article>
            <article className="panel"><Clock3 size={18} /><small>최장 보유</small><strong>{participant.longestHoldingRounds}라운드</strong></article>
          </section>

          <section className="panel live-section">
            <div className="section-heading section-heading--compact">
              <div><span className="eyebrow">실시간 평가</span><h2>보유 종목</h2></div>
              <span className="count-chip">{myState.positions.length} 종목</span>
            </div>
            {myState.positions.length > 0 ? (
              <div className="data-list">
                {myState.positions.map((position) => {
                  const ownCost = position.quantity * position.averagePrice - position.leveragePrincipal
                  const profit = position.netValue - ownCost
                  const returnPercent = ownCost > 0 ? (profit / ownCost) * 100 : 0
                  return (
                    <article className="data-row position-row" key={position.id}>
                      <span className="ticker-mark">{position.ticker.slice(0, 2)}</span>
                      <div className="data-row__identity"><strong>{position.stockName}</strong><small>{position.ticker} · {position.quantity}주 · {position.holdingRounds}라운드 보유</small></div>
                      <div><small>평균가</small><strong>{formatPrice(position.averagePrice)}</strong></div>
                      <div><small>순평가액</small><strong>{formatRp(position.netValue)}</strong></div>
                      <div className={movementClass(profit)}><small>평가손익</small><strong>{formatRp(profit)} · {formatPercent(returnPercent)}</strong></div>
                    </article>
                  )
                })}
              </div>
            ) : <p className="muted-empty">체결된 보유 종목이 없습니다.</p>}
          </section>

          <section className="panel live-section">
            <div className="section-heading section-heading--compact">
              <div><span className="eyebrow">매수부터 전량 매도까지</span><h2>매매 사이클</h2></div>
              <Activity size={18} />
            </div>
            {myState.tradeCycles.length > 0 ? (
              <div className="compact-history">
                {myState.tradeCycles.map((cycle) => (
                  <div key={cycle.id}>
                    <span><strong>{cycle.stockName}</strong><small>{cycle.openedRoundNumber}라운드 시작 · {cycle.status === 'closed' ? `${cycle.closedRoundNumber}라운드 종료` : '보유 중'}</small></span>
                    <span className={movementClass(cycle.realizedProfit ?? 0)}>
                      {cycle.status === 'closed' ? formatRp(cycle.realizedProfit ?? 0) : `${cycle.holdingRounds}라운드`}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="muted-empty">완료되거나 진행 중인 매매 사이클이 없습니다.</p>}
          </section>

          <section className="panel live-section">
            <div className="section-heading section-heading--compact">
              <div><span className="eyebrow">최근 변동</span><h2>RP 기록</h2></div>
            </div>
            <div className="compact-history">
              {myState.ledger.slice(0, 10).map((entry) => (
                <div key={entry.id}>
                  <span><strong>{ledgerLabels[entry.type] ?? entry.type}</strong><small>처리 후 {formatRp(entry.balanceAfter)}</small></span>
                  <span className={movementClass(entry.amount)}>{entry.amount > 0 ? '+' : ''}{formatRp(entry.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </ParticipantGate>
  )
}
