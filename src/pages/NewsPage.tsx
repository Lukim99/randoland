import { CalendarClock, Newspaper, Radio } from 'lucide-react'
import { formatKstDateTime } from '../lib/format'
import { useMarket } from '../market/useMarket'

export function NewsPage() {
  const { market, newsFeed, loading } = useMarket()
  const latestEdition = newsFeed?.editions[0]

  if (loading && !market) {
    return <div className="skeleton skeleton--chart" aria-label="뉴스 불러오는 중" />
  }

  if (!market?.league || !latestEdition) {
    return (
      <div className="news-page">
        <header className="news-page-header">
          <span className="news-masthead-mark"><Newspaper size={26} /></span>
          <div><span className="eyebrow">란도랜드2 시장 뉴스</span><h1>란도일보</h1></div>
        </header>
        <section className="panel news-page-empty">
          <Newspaper size={30} />
          <h2>아직 발행된 뉴스가 없습니다</h2>
          <p>다음 정산에서 메인뉴스와 시장 소식이 게시됩니다.</p>
        </section>
      </div>
    )
  }

  const paragraphs = latestEdition.mainBody
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
          <span><CalendarClock size={14} /> {latestEdition.roundNumber}라운드</span>
          <time dateTime={latestEdition.publishedAt}>{formatKstDateTime(latestEdition.publishedAt)}</time>
        </div>
      </header>

      <div className="news-edition-layout">
        <article className="panel main-news-article">
          <div className="main-news-article__meta">
            <span><Radio size={14} /> 메인뉴스</span>
            {latestEdition.globalEventTitle && <strong>{latestEdition.globalEventTitle}</strong>}
          </div>
          <h2>{latestEdition.mainHeadline}</h2>
          <p className="main-news-article__summary">{latestEdition.mainSummary}</p>
          <div className="main-news-article__body">
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </article>

        <section className="brief-news-section" aria-labelledby="brief-news-title">
          <h2 className="sr-only" id="brief-news-title">개별뉴스</h2>

          {latestEdition.briefs.length > 0 ? (
            <div className="brief-news-list">
              {latestEdition.briefs.map((brief) => (
                <article className="panel brief-news-item" key={brief.id}>
                  <span className="brief-news-item__dot" aria-hidden="true" />
                  <div>
                    <h3>{brief.headline}</h3>
                    <p>{brief.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel brief-news-empty">
              <p>오늘은 별도로 보도할 개별 소식이 없습니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
