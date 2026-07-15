import { ArrowRight, Newspaper } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { formatKstDateTime } from '../lib/format'
import type { NewsEdition } from '../types/market'

interface StockNewsPanelProps {
  stockId: string
  stockName: string
  edition?: NewsEdition
}

export function StockNewsPanel({ stockId, stockName, edition }: StockNewsPanelProps) {
  const headingId = useId()
  const briefs = edition?.briefs.filter((brief) => brief.affectedStockIds.includes(stockId)) ?? []

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

      {briefs.length > 0 ? (
        <div className="stock-news-panel__list">
          {briefs.map((brief) => (
            <article key={brief.id}>
              <h3>{brief.headline}</h3>
              <p>{brief.summary}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="stock-news-panel__empty">
          {edition ? '이번 발행본에 연결된 개별뉴스가 없습니다.' : '다음 정산에서 개별뉴스가 게시됩니다.'}
        </p>
      )}

      <Link to="/news">란도일보 전체 보기 <ArrowRight size={14} /></Link>
    </section>
  )
}
