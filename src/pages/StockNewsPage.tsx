import { ArrowLeft, Newspaper } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { formatKstDateTime } from '../lib/format'
import { useMarket } from '../market/useMarket'

export function StockNewsPage() {
  const { stockId } = useParams()
  const { market, newsFeed, loading } = useMarket()

  if (loading && !market) {
    return <div className="skeleton skeleton--chart" aria-label="종목 뉴스 불러오는 중" />
  }

  const stock = market?.stocks.find((item) => item.id === stockId)
  if (!stock || !market) return <Navigate to="/" replace />

  const editions = [...(newsFeed?.editions ?? [])]
    .sort((left, right) => right.roundNumber - left.roundNumber || Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .map((edition) => ({
      edition,
      briefs: edition.briefs.filter((brief) => brief.affectedStockIds.includes(stock.id)),
    }))
    .filter(({ briefs }) => briefs.length > 0)

  return (
    <div className="news-page stock-news-history-page">
      <Link className="back-link" to={`/stock/${stock.id}`}><ArrowLeft size={16} /> {stock.name} 종목으로 돌아가기</Link>

      <header className="news-page-header stock-news-history-header">
        <span className="news-masthead-mark"><Newspaper size={26} /></span>
        <div>
          <span className="eyebrow">란도일보 종목별 뉴스</span>
          <h1>{stock.name}</h1>
          <p>종목에 영향을 준 개별뉴스를 최신 라운드부터 확인할 수 있습니다.</p>
        </div>
      </header>

      {editions.length > 0 ? (
        <div className="stock-news-history-list">
          {editions.map(({ edition, briefs }) => (
            <section className="panel stock-news-history-edition" key={edition.id} aria-labelledby={`stock-news-round-${edition.id}`}>
              <header>
                <h2 id={`stock-news-round-${edition.id}`}>{edition.roundNumber}라운드</h2>
                <time dateTime={edition.publishedAt}>{formatKstDateTime(edition.publishedAt)}</time>
              </header>
              <div className="stock-news-history-briefs">
                {briefs.map((brief) => (
                  <article key={brief.id}>
                    <h3>{brief.headline}</h3>
                    <p>{brief.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel news-page-empty">
          <Newspaper size={30} />
          <h2>아직 연결된 개별뉴스가 없습니다</h2>
          <p>이 종목에 영향을 주는 뉴스가 발행되면 라운드별로 표시됩니다.</p>
        </section>
      )}
    </div>
  )
}
