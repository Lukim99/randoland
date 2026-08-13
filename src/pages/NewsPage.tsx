import { ArrowDownRight, ArrowUpRight, Building2, CalendarClock, Minus, Newspaper, Radio } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { formatKstDateTime, formatPercent, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'

function MovementIcon({ value }: { value: number }) {
  if (value > 0) return <ArrowUpRight size={15} aria-hidden="true" />
  if (value < 0) return <ArrowDownRight size={15} aria-hidden="true" />
  return <Minus size={15} aria-hidden="true" />
}

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
          <p>다음 정산에서 글로벌 뉴스와 입력된 개별기사가 게시됩니다.</p>
        </section>
      </div>
    )
  }

  const paragraphs = selectedEdition.mainBody
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

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
        <article className="panel main-news-article">
          <div className="main-news-article__meta">
            <span><Radio size={14} /> 글로벌 뉴스</span>
            <strong>관리자 입력 원문</strong>
          </div>
          <h2>{selectedEdition.mainHeadline}</h2>
          <div className="main-news-article__body">
            {paragraphs.map((paragraph, index) => <p key={`${index}:${paragraph}`}>{paragraph}</p>)}
          </div>
        </article>

        <section className="individual-news-section" aria-labelledby="individual-news-title">
          <div className="individual-news-section__heading">
            <span><Building2 size={15} /> 개별기사</span>
            <small>관리자 입력 원문</small>
          </div>
          <h2 className="sr-only" id="individual-news-title">개별기사</h2>

          {selectedEdition.items.length > 0 ? (
            <div className="individual-news-list">
              {selectedEdition.items.map((item) => {
                const itemParagraphs = item.body
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)

                return (
                  <article className="panel individual-news-item" key={item.id}>
                    <header>
                      <Link to={`/stock/${item.stockId}`}>
                        <span>{item.ticker}</span>
                        <strong>{item.stockName}</strong>
                      </Link>
                      <span className={`individual-news-item__change ${movementClass(item.changePercent)}`}>
                        <MovementIcon value={item.changePercent} /> {formatPercent(item.changePercent)}
                      </span>
                    </header>
                    <h3>{item.headline}</h3>
                    <div className="individual-news-item__body">
                      {itemParagraphs.map((paragraph, index) => <p key={`${index}:${paragraph}`}>{paragraph}</p>)}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="panel brief-news-empty">
              <p>이 라운드에는 입력된 개별기사가 없습니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
