import {
  ArrowRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  EyeOff,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { CandlestickChart } from '../components/CandlestickChart'
import { LeagueJoinCard } from '../components/LeagueJoinCard'
import { MarketList } from '../components/MarketList'
import { OrderPanel } from '../components/OrderPanel'
import { StockLogo } from '../components/StockLogo'
import { useRoundClock } from '../hooks/useRoundClock'
import { formatKstDateTime, formatPercent, formatPrice, formatRp, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'

export function DashboardPage() {
  const { market, myState, newsFeed, loading, refreshing, error, refresh } = useMarket()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { nextSettlement, remaining, elapsed } = useRoundClock(market?.round?.settlesAt)
  const selectedStock = market?.stocks.find((stock) => stock.id === selectedId) ?? market?.stocks[0]

  if (loading && !market) {
    return <DashboardSkeleton />
  }

  if (!market) {
    return (
      <section className="empty-state panel">
        <ShieldCheck size={30} />
        <h1>시장 정보를 불러오지 못했습니다</h1>
        <p>{error ?? 'Supabase 연결 상태를 확인해 주세요.'}</p>
        <button type="button" onClick={() => void refresh()}>
          <RefreshCw size={16} /> 다시 불러오기
        </button>
      </section>
    )
  }

  if (!market.league) {
    return (
      <div className="dashboard-page">
        <LeagueJoinCard />
        {error && <p className="page-error" role="alert">{error}</p>}
      </div>
    )
  }

  const participant = myState?.participant
  const pendingOrderCount = (myState?.orders ?? []).filter(
    (order) => order.status === 'pending' || order.status === 'locked',
  ).length
  const latestCandle = selectedStock?.candles.at(-1)
  const latestEdition = newsFeed?.editions[0]

  return (
    <div className="dashboard-page">
      <section className="market-hero">
        <div className="market-hero__copy">
          <div className="round-label">
            <span className="status-dot" />
            {market.league.name}
            {market.round && ` · ${market.round.number}라운드`}
            {refreshing && <span className="live-refresh-chip">갱신 중</span>}
          </div>
          <h1>
            {market.round ? (elapsed ? '일괄 정산을 처리하고 있습니다' : '다음 일괄 체결까지') : '첫 라운드를 준비하고 있습니다'}
            <strong>{market.round ? (elapsed ? '정산 중' : remaining) : '준비 중'}</strong>
          </h1>
          <p>
            {market.round
              ? `접수된 주문은 ${formatKstDateTime(nextSettlement.toISOString())}에 주문 시점 가격으로 체결됩니다.`
              : '운영 일정을 준비하고 있습니다.'}
          </p>
        </div>
      </section>

      {error && <p className="page-error" role="alert">{error}</p>}
      <LeagueJoinCard compact />

      <section className="asset-stats" aria-label="내 자산 요약">
        <article className="stat-card stat-card--featured">
          <span className="stat-icon"><Wallet size={19} /></span>
          <div>
            <small>총 보유자산</small>
            <strong>{participant ? formatRp(participant.netWorth) : '참가 전'}</strong>
            <span className="positive-copy">{participant?.nickname ?? '닉네임 설정 후 참가'}</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><CircleDollarSign size={19} /></span>
          <div>
            <small>주문 가능 RP</small>
            <strong>{participant ? formatRp(participant.availableCash) : '-'}</strong>
            <span>대기 주문 {pendingOrderCount}건</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><Clock3 size={19} /></span>
          <div>
            <small>완료 매매 사이클</small>
            <strong>{participant ? `${participant.completedTradeCycles}회` : '-'}</strong>
            <span>매수 / 공매도 포지션 전량 청산</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><EyeOff size={19} /></span>
          <div>
            <small>최근 공개 순위</small>
            <strong>{myState?.latestRank ? `${myState.latestRank.rank}위` : '비공개'}</strong>
            <span>매주 일요일 09:00 공개</span>
          </div>
        </article>
      </section>

      {selectedStock ? (
        <>
          <div className="trade-workspace">
            <section className="panel chart-panel">
              <div className="chart-panel__heading">
                <div className="stock-title-block">
                  <StockLogo src={selectedStock.logoImageUrl} spriteIndex={selectedStock.logoSpriteIndex} size="lg" label={`${selectedStock.name} 종목 이미지`} />
                  <div>
                    <span className="eyebrow">{selectedStock.ticker}</span>
                    <h2>{selectedStock.name}</h2>
                  </div>
                </div>
                <div className="stock-live-quote">
                  <strong>{formatPrice(selectedStock.currentPrice)}</strong>
                  <span className={`movement ${movementClass(selectedStock.changePercent)}`}>
                    {formatPercent(selectedStock.changePercent)}
                  </span>
                </div>
              </div>
              <div className="chart-subnav">
                <span className="is-active">일봉</span>
                {latestCandle && (
                  <span className="ohlc-summary">
                    시 {formatPrice(latestCandle.open)} · 고 {formatPrice(latestCandle.high)} · 저{' '}
                    {formatPrice(latestCandle.low)} · 종 {formatPrice(latestCandle.close)}
                  </span>
                )}
              </div>
              <CandlestickChart candles={selectedStock.candles} label={selectedStock.name} />
              <div className="chart-description">
                <p>{selectedStock.description}</p>
                <Link to={`/stock/${selectedStock.id}`}>
                  종목 상세 <ArrowRight size={15} />
                </Link>
              </div>
            </section>

            <OrderPanel stock={selectedStock} />
          </div>

          <section className="panel market-section">
            <div className="section-heading">
              <div>
                <h2>상장기업 현황</h2>
                <p>종목을 선택하면 위 차트와 주문서가 함께 변경됩니다.</p>
              </div>
              <span className="count-chip">{market.stocks.length} 종목</span>
            </div>
            <MarketList
              stocks={market.stocks}
              selectedId={selectedStock.id}
              onSelect={(stock) => setSelectedId(stock.id)}
            />
          </section>
        </>
      ) : (
        <section className="panel market-empty-state">
          <Building2 size={28} />
          <h2>아직 상장된 종목이 없습니다</h2>
          <p>리그 참가자는 한 개의 종목을 상장할 수 있습니다. 첫 종목을 제출하면 시장 목록에 즉시 반영됩니다.</p>
          {myState?.joined && <Link className="action-button" to="/listing">종목 상장하기</Link>}
        </section>
      )}

      <section className="news-section">
        <div className="section-heading">
          <div>
            <h2>란도일보</h2>
            <p>메인뉴스와 시장의 개별 소식을 한곳에서 확인합니다.</p>
          </div>
          <span className="news-time"><Newspaper size={15} /> 09:00 업데이트</span>
        </div>
        <div className="news-grid">
          {latestEdition ? (
            <article className="news-card news-card--lead dashboard-news-lead">
              <div className="news-card__meta">
                <span>메인뉴스</span>
                <time dateTime={latestEdition.publishedAt}>{formatKstDateTime(latestEdition.publishedAt)}</time>
              </div>
              <h3>{latestEdition.mainHeadline}</h3>
              <p>{latestEdition.mainSummary}</p>
              <Link to="/news">
                전체 뉴스 보기 <ArrowRight size={15} />
              </Link>
            </article>
          ) : (
            <div className="news-empty panel">
              <Newspaper size={24} />
              <p>다음 정산에서 첫 란도일보가 게시됩니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-live="polite" aria-label="거래소 화면 불러오는 중">
      <div className="skeleton skeleton--hero" />
      <div className="skeleton-row">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="skeleton skeleton--chart" />
    </div>
  )
}
