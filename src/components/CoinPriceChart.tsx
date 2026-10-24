import { useEffect, useRef, useState } from 'react'
import { loadCoinCandlePage, loadCoinCandles, type CoinCandlePage } from '../services/market'
import { CandlestickChart } from './CandlestickChart'

const PAGE_SIZE = 360
const candleTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

export function CoinPriceChart({ stockId, label, quoteUpdatedAt, roundRevision, height = 400 }: { stockId: string; label: string; quoteUpdatedAt: string | null; roundRevision: string; height?: number }) {
  const [before, setBefore] = useState<string | null>(null)
  const [newerPages, setNewerPages] = useState<Array<string | null>>([])
  const [result, setResult] = useState<{ before: string | null; page: CoinCandlePage } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const livePage = useRef<{ revision: string; page: CoinCandlePage } | null>(null)
  const historyPages = useRef(new Map<string, CoinCandlePage>())

  useEffect(() => {
    let active = true
    async function loadPage() {
      let page: CoinCandlePage
      if (before !== null) {
        // Historical pages are immutable and are only read when requested.
        page = historyPages.current.get(before) ?? await loadCoinCandlePage(stockId, before)
        if (!active) return
        historyPages.current.set(before, page)
      } else {
        const cached = livePage.current
        const revision = `${quoteUpdatedAt}:${roundRevision}:${retry}`
        const lastTime = cached?.page.candles.at(-1)?.time
        if (cached?.revision === revision) {
          page = cached.page
        } else if (cached && lastTime && quoteUpdatedAt && Date.parse(quoteUpdatedAt) - Date.parse(lastTime) < PAGE_SIZE * 60_000) {
          const points = await loadCoinCandles(stockId, lastTime)
          const merged = [...new Map([...cached.page.candles, ...points].map((point) => [point.time, point])).values()]
            .sort((left, right) => left.time.localeCompare(right.time))
          page = { candles: merged.slice(-PAGE_SIZE), hasEarlier: cached.page.hasEarlier || merged.length > PAGE_SIZE }
        } else {
          page = await loadCoinCandlePage(stockId, null)
        }
        if (!active) return
        livePage.current = { revision, page }
      }
      setResult((current) => current?.before === before && current.page === page ? current : { before, page })
      setError(null)
    }
    void loadPage().catch((next: unknown) => {
      if (active) setError(next instanceof Error ? next.message : '분봉을 불러오지 못했습니다.')
    })
    return () => { active = false }
  }, [stockId, before, quoteUpdatedAt, roundRevision, retry])

  const page = result?.before === before ? result.page : null
  const first = page?.candles[0]
  const last = page?.candles.at(-1)

  function showEarlier() {
    if (!first || !page?.hasEarlier) return
    setError(null)
    setNewerPages((current) => [...current, before])
    setBefore(first.time)
  }

  function showNewer() {
    if (!newerPages.length) return
    setError(null)
    setBefore(newerPages.at(-1) ?? null)
    setNewerPages((current) => current.slice(0, -1))
  }

  return <>
    {error && <p role="alert" className="form-message is-error">{error} <button type="button" className="text-button" onClick={() => setRetry((value) => value + 1)}>다시 시도</button></p>}
    {page ? <CandlestickChart candles={page.candles} label={label} height={height} interval="minute" /> : <div className="coin-chart-loading" style={{ minHeight: height }} role="status">{error ? '분봉을 표시할 수 없습니다.' : '분봉을 불러오는 중입니다.'}</div>}
    <div className="coin-chart-history">
      <p className="coin-chart-range" aria-live="polite">
        {first && last ? <><time dateTime={first.time}>{candleTime.format(new Date(first.time))}</time><span>~</span><time dateTime={last.time}>{candleTime.format(new Date(last.time))}</time><span>KST</span></> : '1분봉 · KST'}
      </p>
      <div className="coin-chart-history__buttons" role="group" aria-label="분봉 조회 구간">
        <button type="button" className="secondary-button" onClick={showEarlier} disabled={!page?.hasEarlier}>이전 분봉</button>
        <button type="button" className="secondary-button" onClick={showNewer} disabled={!newerPages.length}>다음 분봉</button>
        <button type="button" className="secondary-button" onClick={() => { setBefore(null); setNewerPages([]); setError(null) }} disabled={before === null}>최신</button>
      </div>
    </div>
  </>
}
