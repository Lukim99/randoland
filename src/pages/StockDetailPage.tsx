import { ArrowLeft, Layers3, MessageSquareText, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { CandlestickChart } from '../components/CandlestickChart'
import { OrderPanel } from '../components/OrderPanel'
import { StockLogo } from '../components/StockLogo'
import { StockNewsPanel } from '../components/StockNewsPanel'
import { formatPercent, formatPrice, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'

export function StockDetailPage() {
  const { stockId } = useParams()
  const { market, myState, newsFeed, favoriteStockIds, loading, setStockFavorite } = useMarket()
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  if (loading && !market) return <div className="skeleton skeleton--chart" aria-label="종목 불러오는 중" />

  const stock = market?.stocks.find((item) => item.id === stockId)
  if (!stock || !market) return <Navigate to="/" replace />

  const latest = stock.candles.at(-1)
  const latestEdition = newsFeed?.editions[0]
  const currentStockId = stock.id
  const isFavorite = favoriteStockIds.includes(currentStockId)

  async function handleFavorite() {
    setFavoriteError(null)
    try {
      await setStockFavorite(currentStockId, !isFavorite)
    } catch (favoriteRequestError) {
      setFavoriteError(favoriteRequestError instanceof Error
        ? favoriteRequestError.message
        : '즐겨찾기를 변경하지 못했습니다.')
    }
  }

  return (
    <div className="stock-detail-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> 거래소로 돌아가기</Link>
      <header className="stock-detail-header">
        <div className="stock-title-block">
          <StockLogo src={stock.logoImageUrl} spriteIndex={stock.logoSpriteIndex} size="xl" label={`${stock.name} 종목 이미지`} />
          <div>
            <h1>{stock.name}</h1>
            <p>{stock.description}</p>
          </div>
        </div>
        <div className="stock-detail-side">
          <div className="stock-detail-actions">
            <button
              className={`secondary-action-button${isFavorite ? ' is-favorite' : ''}`}
              type="button"
              aria-pressed={isFavorite}
              disabled={!myState?.joined || stock.status === 'delisted'}
              onClick={() => void handleFavorite()}
              title={myState?.joined ? undefined : '리그 참가 후 즐겨찾기를 사용할 수 있습니다.'}
            >
              <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
              {isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
            </button>
            {stock.status !== 'delisted' && (
              <Link className="secondary-action-button" to={`/discussion/${stock.id}`}>
                <MessageSquareText size={16} /> 종목토론방
              </Link>
            )}
          </div>
          <div className="stock-detail-quote">
            <small>현재가</small>
            <strong>{formatPrice(stock.currentPrice)} RP</strong>
            <span className={`movement ${movementClass(stock.changePercent)}`}>{formatPercent(stock.changePercent)}</span>
            {stock.marketAction !== 'normal' && (
              <span className={`stock-market-action stock-market-action--${stock.marketAction}`}>
                {stock.marketAction === 'halt' ? '거래정지' : '상장폐지'}
              </span>
            )}
          </div>
        </div>
      </header>
      {favoriteError && <p className="form-message is-error" role="alert">{favoriteError}</p>}

      <div className="stock-detail-layout">
        <div className="stock-detail-main">
          <section className="panel detail-chart-panel">
            <div className="section-heading section-heading--compact">
              <div><h2>가격 흐름</h2></div>
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

          <StockNewsPanel
            stockId={stock.id}
            stockName={stock.name}
            edition={latestEdition}
          />

          <section className="stock-info-grid">
            <article className="panel info-card"><Layers3 size={20} /><small>테마</small><strong>{stock.theme}</strong></article>
          </section>
        </div>
        <OrderPanel stock={stock} />
      </div>
    </div>
  )
}
