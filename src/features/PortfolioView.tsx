import {
  AlertTriangle,
  Banknote,
  Landmark,
  ReceiptText,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { StockLogo } from '../components/StockLogo'
import { formatKstDateTime, formatPercent, formatPrice, formatRp, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'
import { ParticipantGate } from './ParticipantGate'

const ledgerLabels: Record<string, string> = {
  initial_balance: '초기 자금',
  buy: '매수 체결',
  sell: '매도 체결',
  short_open: '공매도 체결',
  short_cover: '공매도 청산',
  short_profit: '공매도 이익',
  short_loss: '공매도 손실',
  receivable_created: '미수 RP 발생',
  receivable_repayment: '미수 RP 상환',
  leverage_borrow: '레버리지 사용',
  leverage_repayment: '레버리지 상환',
  leverage_fee: '레버리지 차감',
  ladder_reward: '홀짝 보상',
  admin_adjustment: '운영 조정',
}

type PortfolioTab = 'balance' | 'profit' | 'ledger'

const portfolioTabs: PortfolioTab[] = ['balance', 'profit', 'ledger']

export function PortfolioView() {
  const { market, myState } = useMarket()
  const participant = myState?.participant
  const [activeTab, setActiveTab] = useState<PortfolioTab>('balance')

  const holdings = myState
    ? [
        ...myState.positions.map((position) => {
          const entryValue = position.averagePrice * position.quantity
          const marketValue = position.grossValue
          const profit = marketValue - entryValue
          return {
            key: `long-${position.id}`,
            stockId: position.stockId,
            ticker: position.ticker,
            name: position.stockName,
            type: 'long' as const,
            quantity: position.quantity,
            averagePrice: position.averagePrice,
            currentPrice: position.currentPrice,
            entryValue,
            marketValue,
            profit,
            returnPercent: entryValue > 0 ? (profit / entryValue) * 100 : 0,
            holdingRounds: position.holdingRounds,
            leveragePrincipal: position.leveragePrincipal,
          }
        }),
        ...myState.shortPositions.map((position) => ({
          key: `short-${position.id}`,
          stockId: position.stockId,
          ticker: position.ticker,
          name: position.stockName,
          type: 'short' as const,
          quantity: position.quantity,
          averagePrice: position.averageEntryPrice,
          currentPrice: position.currentPrice,
          entryValue: position.entryValue,
          marketValue: position.coverValue,
          profit: position.unrealizedProfit,
          returnPercent: position.unrealizedReturn,
          holdingRounds: position.holdingRounds,
          leveragePrincipal: 0,
        })),
      ]
    : []
  const closedCycles = myState?.tradeCycles.filter((cycle) => cycle.status === 'closed') ?? []

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentTab: PortfolioTab) {
    const currentIndex = portfolioTabs.indexOf(currentTab)
    let nextIndex = currentIndex

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % portfolioTabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + portfolioTabs.length) % portfolioTabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = portfolioTabs.length - 1
    else return

    event.preventDefault()
    const nextTab = portfolioTabs[nextIndex]
    setActiveTab(nextTab)
    document.getElementById(`portfolio-tab-${nextTab}`)?.focus()
  }

  return (
    <ParticipantGate>
      {participant && myState && (
        <div className="feature-stack portfolio-view">
          <section className="panel account-overview">
            <div className="account-overview__headline">
              <span><WalletCards size={19} /> 총자산</span>
              <strong>{formatRp(participant.netWorth)}</strong>
              <small className={movementClass(participant.totalUnrealizedProfit)}>
                평가손익 {participant.totalUnrealizedProfit > 0 ? '+' : ''}{formatRp(participant.totalUnrealizedProfit)} ({formatPercent(participant.totalUnrealizedReturn)})
              </small>
            </div>
            <dl className="account-summary-grid">
              <div><dt>예수금</dt><dd>{formatRp(participant.cashBalance)}</dd></div>
              <div><dt>주문가능금액</dt><dd>{formatRp(participant.availableCash)}</dd></div>
              <div><dt>주식평가금액</dt><dd>{formatRp(participant.longMarketValue)}</dd></div>
              <div><dt>총 매입금액</dt><dd>{formatRp(participant.longCostBasis)}</dd></div>
              <div><dt>공매도 상환액</dt><dd>{formatRp(participant.shortExposure)}</dd></div>
              <div><dt>공매도 평가손익</dt><dd className={movementClass(participant.shortUnrealizedProfit)}>{participant.shortUnrealizedProfit > 0 ? '+' : ''}{formatRp(participant.shortUnrealizedProfit)}</dd></div>
              <div><dt>레버리지 잔액</dt><dd>{formatRp(participant.leveragePrincipal)}</dd><small>예상 차감 {formatRp(participant.projectedLeverageFee)}</small></div>
              <div className={participant.receivableRp > 0 ? 'has-receivable' : ''}><dt>미수 RP</dt><dd>{formatRp(participant.receivableRp)}</dd></div>
            </dl>
          </section>

          {participant.receivableRp > 0 && (
            <section className="receivable-alert" role="status">
              <AlertTriangle size={19} />
              <span><strong>미수 RP {formatRp(participant.receivableRp)}</strong><small>RP 유입 시 우선 상환되며 신규 매수와 신규 공매도만 제한됩니다.</small></span>
            </section>
          )}

          <section className="panel brokerage-panel">
            <div className="portfolio-tabs" role="tablist" aria-label="자산 상세">
              <button id="portfolio-tab-balance" aria-controls="portfolio-panel-balance" role="tab" type="button" aria-selected={activeTab === 'balance'} tabIndex={activeTab === 'balance' ? 0 : -1} className={activeTab === 'balance' ? 'is-active' : ''} onKeyDown={(event) => handleTabKeyDown(event, 'balance')} onClick={() => setActiveTab('balance')}>보유잔고 <span>{holdings.length}</span></button>
              <button id="portfolio-tab-profit" aria-controls="portfolio-panel-profit" role="tab" type="button" aria-selected={activeTab === 'profit'} tabIndex={activeTab === 'profit' ? 0 : -1} className={activeTab === 'profit' ? 'is-active' : ''} onKeyDown={(event) => handleTabKeyDown(event, 'profit')} onClick={() => setActiveTab('profit')}>실현손익 <span>{closedCycles.length}</span></button>
              <button id="portfolio-tab-ledger" aria-controls="portfolio-panel-ledger" role="tab" type="button" aria-selected={activeTab === 'ledger'} tabIndex={activeTab === 'ledger' ? 0 : -1} className={activeTab === 'ledger' ? 'is-active' : ''} onKeyDown={(event) => handleTabKeyDown(event, 'ledger')} onClick={() => setActiveTab('ledger')}>RP 내역</button>
            </div>

            {activeTab === 'balance' && (
              <div id="portfolio-panel-balance" role="tabpanel" aria-labelledby="portfolio-tab-balance">
                {holdings.length > 0 ? (
                  <>
                    <div className="holdings-table-wrap">
                      <table className="holdings-table">
                        <thead><tr><th>종목</th><th>구분</th><th>수량</th><th>평균가</th><th>현재가</th><th>매입·진입금액</th><th>평가·상환금액</th><th>평가손익</th><th>수익률</th><th>레버리지·부채</th></tr></thead>
                        <tbody>
                          {holdings.map((holding) => {
                            const stock = market?.stocks.find((item) => item.id === holding.stockId)
                            return (
                              <tr key={holding.key}>
                                <td><span className="holding-stock"><StockLogo src={stock?.logoImageUrl} spriteIndex={stock?.logoSpriteIndex ?? 0} size="sm" label="" /><span><strong>{holding.name}</strong><small>{holding.ticker} · {holding.holdingRounds}라운드</small></span></span></td>
                                <td><span className={`position-type ${holding.type}`}>{holding.type === 'long' ? '매수' : '공매도'}</span></td>
                                <td>{formatPrice(holding.quantity)}주</td>
                                <td>{formatPrice(holding.averagePrice)}</td>
                                <td>{formatPrice(holding.currentPrice)}</td>
                                <td>{formatRp(holding.entryValue)}</td>
                                <td>{formatRp(holding.marketValue)}</td>
                                <td className={movementClass(holding.profit)}>{holding.profit > 0 ? '+' : ''}{formatRp(holding.profit)}</td>
                                <td className={movementClass(holding.returnPercent)}>{formatPercent(holding.returnPercent)}</td>
                                <td>{holding.leveragePrincipal > 0 ? <span className="holding-debt"><small>레버리지</small><strong>{formatRp(holding.leveragePrincipal)}</strong></span> : '-'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="holding-mobile-list">
                      {holdings.map((holding) => {
                        const stock = market?.stocks.find((item) => item.id === holding.stockId)
                        return (
                          <article className="holding-mobile-card" key={holding.key}>
                            <div className="holding-mobile-card__head">
                              <span className="holding-stock"><StockLogo src={stock?.logoImageUrl} spriteIndex={stock?.logoSpriteIndex ?? 0} size="sm" label="" /><span><strong>{holding.name}</strong><small>{holding.ticker} · {holding.quantity}주</small></span></span>
                              <span className={`position-type ${holding.type}`}>{holding.type === 'long' ? '매수' : '공매도'}</span>
                            </div>
                            <dl>
                              <div><dt>평균가</dt><dd>{formatPrice(holding.averagePrice)} RP</dd></div>
                              <div><dt>현재가</dt><dd>{formatPrice(holding.currentPrice)} RP</dd></div>
                              <div><dt>{holding.type === 'long' ? '평가금액' : '상환금액'}</dt><dd>{formatRp(holding.marketValue)}</dd></div>
                              <div><dt>평가손익</dt><dd className={movementClass(holding.profit)}>{holding.profit > 0 ? '+' : ''}{formatRp(holding.profit)} · {formatPercent(holding.returnPercent)}</dd></div>
                            </dl>
                            {holding.leveragePrincipal > 0 && <small className="holding-leverage">레버리지 {formatRp(holding.leveragePrincipal)}</small>}
                          </article>
                        )
                      })}
                    </div>
                  </>
                ) : <p className="muted-empty portfolio-empty">체결된 보유 포지션이 없습니다.</p>}
              </div>
            )}

            {activeTab === 'profit' && (
              <div id="portfolio-panel-profit" role="tabpanel" aria-labelledby="portfolio-tab-profit">
                {closedCycles.length > 0 ? (
                  <div className="profit-history">
                    {closedCycles.map((cycle) => (
                      <article key={cycle.id}>
                        <span className={`position-type ${cycle.positionType}`}>{cycle.positionType === 'long' ? '매수' : '공매도'}</span>
                        <span><strong>{cycle.stockName}</strong><small>{cycle.openedRoundNumber}라운드 진입 · {cycle.closedRoundNumber}라운드 청산 · {cycle.holdingRounds}라운드 보유</small></span>
                        <dl><div><dt>진입금액</dt><dd>{formatRp(cycle.investedAmount)}</dd></div><div><dt>회수금액</dt><dd>{formatRp(cycle.returnedAmount ?? 0)}</dd></div></dl>
                        <strong className={movementClass(cycle.realizedProfit ?? 0)}>{(cycle.realizedProfit ?? 0) > 0 ? '+' : ''}{formatRp(cycle.realizedProfit ?? 0)}</strong>
                      </article>
                    ))}
                  </div>
                ) : <p className="muted-empty portfolio-empty">완료된 매매가 없습니다.</p>}
              </div>
            )}

            {activeTab === 'ledger' && (
              <div id="portfolio-panel-ledger" role="tabpanel" aria-labelledby="portfolio-tab-ledger">
                {myState.ledger.length > 0 ? (
                  <div className="ledger-history">
                    {myState.ledger.map((entry) => (
                      <article key={entry.id}>
                        <span className="ledger-icon">{entry.amount >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}</span>
                        <span><strong>{ledgerLabels[entry.type] ?? entry.type}</strong><small>{formatKstDateTime(entry.createdAt)}</small></span>
                        <span><strong className={movementClass(entry.amount)}>{entry.amount > 0 ? '+' : ''}{formatRp(entry.amount)}</strong><small>예수금 {formatRp(entry.balanceAfter)}{entry.receivableAfter > 0 ? ` · 미수 ${formatRp(entry.receivableAfter)}` : ''}</small></span>
                      </article>
                    ))}
                  </div>
                ) : <p className="muted-empty portfolio-empty">RP 내역이 없습니다.</p>}
              </div>
            )}
          </section>

          <section className="portfolio-account-foot" aria-label="계좌 기준">
            <span><Landmark size={16} /> 예수금 {formatRp(participant.cashBalance)}</span>
            <span><Scale size={16} /> 부채·예상 차감 {formatRp(participant.projectedLiabilities + participant.receivableRp)}</span>
            <span><Banknote size={16} /> 완료 매매 {participant.completedTradeCycles}회</span>
            <span><ReceiptText size={16} /> 최장 보유 {participant.longestHoldingRounds}라운드</span>
          </section>
        </div>
      )}
    </ParticipantGate>
  )
}
