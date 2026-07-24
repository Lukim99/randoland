import { Building2, CalendarClock, Newspaper, Radio } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { formatKstDateTime } from '../lib/format'
import { useMarket } from '../market/useMarket'

export function NewsPage() {
  const { market, newsFeed, loading } = useMarket()
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null)
  const editions = newsFeed?.editions ?? []
  const selectedEdition = editions.find((edition) => edition.id === selectedEditionId) ?? editions[0]

  if (loading && !market) {
    return <div className="skeleton skeleton--chart" aria-label="뉴스 불러오는 중" />
  }

  if (!market?.league || !selectedEdition) {
    return (
      <div className="news-page">
        <header className="news-page-header">
          <span className="news-masthead-mark"><Newspaper size={26} /></span>
          <div><h1>란도일보</h1></div>
        </header>
        <section className="panel news-page-empty">
          <Newspaper size={30} />
          <h2>아직 발행된 뉴스가 없습니다</h2>
          <p>다음 정산에서 메인뉴스와 시장 소식이 게시됩니다.</p>
        </section>
      </div>
    )
  }

  const paragraphs = selectedEdition.mainBody
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const spotlightParagraphs = selectedEdition.spotlightBody
    ?.split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean) ?? []

  return (
    <div className="news-page">
      <header className="news-page-header">
        <span className="news-masthead-mark"><Newspaper size={26} /></span>
        <div>
          <span className="eyebrow">{market.league.name}</span>
          <h1>란도일보</h1>
        </div>
        <div className="news-edition-meta">
          <span><CalendarClock size={14} /> {selectedEdition.roundNumber}라운드</span>
          <time dateTime={selectedEdition.publishedAt}>{formatKstDateTime(selectedEdition.publishedAt)}</time>
        </div>
      </header>

      <nav className="news-round-selector" aria-label="란도일보 발행본 선택">
        <strong>지난 발행본</strong>
        <div>
          {editions.map((edition) => {
            const isSelected = edition.id === selectedEdition.id

            return (
              <button
                type="button"
                className={isSelected ? 'is-selected' : undefined}
                aria-pressed={isSelected}
                key={edition.id}
                onClick={() => setSelectedEditionId(edition.id)}
              >
                <span>{edition.roundNumber}라운드</span>
                <time dateTime={edition.publishedAt}>{formatKstDateTime(edition.publishedAt)}</time>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="news-edition-layout">
        <div className="news-lead-column">
          <article className="panel main-news-article">
            <div className="main-news-article__meta">
              <span><Radio size={14} /> 메인뉴스</span>
              {selectedEdition.globalEventTitle && <strong>{selectedEdition.globalEventTitle}</strong>}
            </div>
            <h2>{selectedEdition.mainHeadline}</h2>
            <p className="main-news-article__summary">{selectedEdition.mainSummary}</p>
            <div className="main-news-article__body">
              {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </article>

          {selectedEdition.spotlightHeadline && (
            <article className="panel spotlight-news-article">
              <div className="main-news-article__meta">
                <span><Building2 size={14} /> 주요 종목 뉴스</span>
                {selectedEdition.spotlightStockName && selectedEdition.spotlightStockId ? (
                  <Link to={`/stock/${selectedEdition.spotlightStockId}`}>
                    {selectedEdition.spotlightStockName}
                  </Link>
                ) : selectedEdition.spotlightStockName ? (
                  <strong>{selectedEdition.spotlightStockName}</strong>
                ) : null}
              </div>
              <h2>{selectedEdition.spotlightHeadline}</h2>
              {selectedEdition.spotlightSummary && (
                <p className="main-news-article__summary">{selectedEdition.spotlightSummary}</p>
              )}
              {spotlightParagraphs.length > 0 && (
                <div className="main-news-article__body">
                  {spotlightParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              )}
            </article>
          )}
        </div>

        <section className="brief-news-section" aria-labelledby="brief-news-title">
          <h2 className="sr-only" id="brief-news-title">개별뉴스</h2>

          {selectedEdition.briefs.length > 0 ? (
            <div className="brief-news-list">
              {selectedEdition.briefs.map((brief) => (
                <article className="panel brief-news-item" key={brief.id}>
                  <span className="brief-news-item__dot" aria-hidden="true" />
                  <div>
                    <div className="brief-news-item__stocks">
                      {brief.affectedStockIds.map((affectedStockId, index) => {
                        const affectedStock = market.stocks.find((stock) => stock.id === affectedStockId)
                        const affectedStockName = affectedStock?.name ?? brief.affectedStockNames[index]
                        if (!affectedStockName) return null

                        return (
                          <Link key={affectedStockId} to={`/stock/${affectedStockId}`}>
                            {affectedStockName}
                          </Link>
                        )
                      })}
                    </div>
                    <h3>{brief.headline}</h3>
                    <p>{brief.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel brief-news-empty">
              <p>이 발행본에는 별도로 보도할 개별 소식이 없습니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
