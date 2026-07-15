import { ArrowLeft, Building2, Layers3 } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { CandlestickChart } from '../components/CandlestickChart'
import { OrderPanel } from '../components/OrderPanel'
import { StockLogo } from '../components/StockLogo'
import { formatPercent, formatPrice, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'

export function StockDetailPage() {
  const { stockId } = useParams()
  const { market, loading } = useMarket()

  if (loading && !market) return <div className="skeleton skeleton--chart" aria-label="종목 불러오는 중" />

  const stock = market?.stocks.find((item) => item.id === stockId)
  if (!stock || !market) return <Navigate to="/" replace />

  const latest = stock.candles.at(-1)

  return (
    <div className="stock-detail-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> 거래소로 돌아가기</Link>
      <header className="stock-detail-header">
        <div className="stock-title-block">
          <StockLogo src={stock.logoImageUrl} spriteIndex={stock.logoSpriteIndex} size="xl" label={`${stock.name} 종목 이미지`} />
          <div>
            <span className="eyebrow">{stock.ticker} · {market.round?.number ?? 0}라운드</span>
            <h1>{stock.name}</h1>
            <p>{stock.description}</p>
          </div>
        </div>
        <div className="stock-detail-quote">
          <small>현재가</small>
          <strong>{formatPrice(stock.currentPrice)} RP</strong>
          <span className={`movement ${movementClass(stock.changePercent)}`}>{formatPercent(stock.changePercent)}</span>
        </div>
      </header>

      <div className="stock-detail-layout">
        <div className="stock-detail-main">
          <section className="panel detail-chart-panel">
            <div className="section-heading section-heading--compact">
              <div><span className="eyebrow">일봉 차트</span><h2>가격 흐름</h2></div>
              <span className="theme-pill">1라운드 = 1일</span>
            </div>
            <CandlestickChart candles={stock.candles} label={stock.name} height={400} />
            {latest && (
              <dl className="ohlc-grid">
                <div><dt>시가</dt><dd>{formatPrice(latest.open)}</dd></div>
                <div><dt>고가</dt><dd className="is-up">{formatPrice(latest.high)}</dd></div>
                <div><dt>저가</dt><dd className="is-down">{formatPrice(latest.low)}</dd></div>
                <div><dt>종가</dt><dd>{formatPrice(latest.close)}</dd></div>
              </dl>
            )}
          </section>

          <section className="stock-info-grid">
            <article className="panel info-card"><Layers3 size={20} /><small>테마</small><strong>{stock.theme}</strong></article>
            <article className="panel info-card"><Building2 size={20} /><small>상장 상태</small><strong>정상 거래</strong></article>
          </section>
        </div>
        <OrderPanel stock={stock} />
      </div>
    </div>
  )
}
