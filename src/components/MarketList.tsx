import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { formatPercent, formatPrice, movementClass } from '../lib/format'
import type { StockSummary } from '../types/market'
import { MiniCandles } from './MiniCandles'

interface MarketListProps {
  stocks: StockSummary[]
  selectedId?: string
  onSelect?: (stock: StockSummary) => void
}

export function MarketList({ stocks, selectedId, onSelect }: MarketListProps) {
  return (
    <>
      <div className="market-table-wrap desktop-market-table">
        <table className="market-table">
          <thead>
            <tr>
              <th>종목</th>
              <th>테마</th>
              <th className="align-right">현재가</th>
              <th className="align-right">등락률</th>
              <th>14R 차트</th>
              <th>상장자</th>
              <th aria-label="상세" />
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr key={stock.id} className={stock.id === selectedId ? 'is-selected' : undefined}>
                <td>
                  <button className="stock-identity" type="button" onClick={() => onSelect?.(stock)}>
                    <span className="ticker-mark">{stock.ticker.slice(0, 2)}</span>
                    <span>
                      <strong>{stock.name}</strong>
                      <small>{stock.ticker}</small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="theme-pill">{stock.theme}</span>
                </td>
                <td className="align-right price-cell">{formatPrice(stock.currentPrice)}</td>
                <td className={`align-right movement ${movementClass(stock.changePercent)}`}>
                  {formatPercent(stock.changePercent)}
                </td>
                <td>
                  <MiniCandles candles={stock.candles} label={stock.name} />
                </td>
                <td>
                  <span className="owner-code">{stock.owner}</span>
                </td>
                <td>
                  <Link className="row-link" to={`/stock/${stock.id}`} aria-label={`${stock.name} 상세 보기`}>
                    <ArrowUpRight size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-market-list">
        {stocks.map((stock) => (
          <article key={stock.id} className={`mobile-stock-card${stock.id === selectedId ? ' is-selected' : ''}`}>
            <button className="mobile-stock-card__main" type="button" onClick={() => onSelect?.(stock)}>
              <span className="stock-identity">
                <span className="ticker-mark">{stock.ticker.slice(0, 2)}</span>
                <span>
                  <strong>{stock.name}</strong>
                  <small>{stock.ticker} · {stock.theme}</small>
                </span>
              </span>
              <span className="mobile-stock-card__quote">
                <strong>{formatPrice(stock.currentPrice)}</strong>
                <small className={`movement ${movementClass(stock.changePercent)}`}>
                  {formatPercent(stock.changePercent)}
                </small>
              </span>
            </button>
            <div className="mobile-stock-card__foot">
              <MiniCandles candles={stock.candles} label={stock.name} />
              <Link to={`/stock/${stock.id}`}>
                종목 보기 <ChevronRight size={15} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
