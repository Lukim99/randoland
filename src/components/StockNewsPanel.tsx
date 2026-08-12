import { ArrowRight, Newspaper } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { formatKstDateTime, formatPercent, movementClass } from '../lib/format'
import type { NewsEdition } from '../types/market'

interface StockNewsPanelProps {
  stockId: string
  stockName: string
  edition?: NewsEdition
}

export function StockNewsPanel({ stockId, stockName, edition }: StockNewsPanelProps) {
  const headingId = useId()
  const items = edition?.items.filter((item) => item.stockId === stockId) ?? []

  return (
    <section className="panel stock-news-panel" aria-labelledby={headingId}>
      <div className="stock-news-panel__heading">
        <div>
          <span className="stock-news-panel__label"><Newspaper size={15} /> {stockName}</span>
          <h2 id={headingId}>연관 개별뉴스</h2>
        </div>
        {edition && (
          <time dateTime={edition.publishedAt}>{formatKstDateTime(edition.publishedAt)}</time>
        )}
      </div>

      {items.length > 0 ? (
        <div className="stock-news-panel__list">
          {items.map((item) => (
            <article key={item.id}>
              <div className="stock-news-panel__article-meta">
                <span>{edition?.roundNumber}라운드</span>
                <strong className={movementClass(item.changePercent)}>{formatPercent(item.changePercent)}</strong>
              </div>
              <h3>{item.headline}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="stock-news-panel__empty">
          {edition ? '이번 발행본에 연결된 개별뉴스가 없습니다.' : '다음 정산에서 개별뉴스가 게시됩니다.'}
        </p>
      )}

      <Link to={`/stock/${stockId}/news`}>{stockName} 뉴스 전체 보기 <ArrowRight size={14} /></Link>
    </section>
  )
}
