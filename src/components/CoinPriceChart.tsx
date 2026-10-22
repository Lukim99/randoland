import { useEffect, useRef, useState } from 'react'
import { loadCoinCandles } from '../services/market'
import type { CandlePoint } from '../types/market'
import { CandlestickChart } from './CandlestickChart'

export function CoinPriceChart({ stockId, label, quoteUpdatedAt, roundRevision, height = 400 }: { stockId: string; label: string; quoteUpdatedAt: string | null; roundRevision: string; height?: number }) {
  const [candles, setCandles] = useState<CandlePoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const latest = useRef<string | null>(null)
  useEffect(() => {
    let active = true
    // Only this detail chart reads minute history; subsequent reads return new points.
    void loadCoinCandles(stockId, latest.current).then((points) => {
      if (!active) return
      setCandles((current) => [...new Map([...current, ...points].map((point) => [point.time, point])).values()].sort((a, b) => a.time.localeCompare(b.time)).slice(-360))
      latest.current = points.at(-1)?.time ?? latest.current
      setError(null)
    }).catch((next: unknown) => { if (active) setError(next instanceof Error ? next.message : '분봉을 불러오지 못했습니다.') })
    return () => { active = false }
  }, [stockId, quoteUpdatedAt, roundRevision, retry])
  return <>{error && <p role="alert" className="form-message is-error">{error} <button type="button" className="text-button" onClick={() => setRetry((value) => value + 1)}>다시 시도</button></p>}<CandlestickChart candles={candles} label={label} height={height} interval="minute" /><p className="loan-note">최근 360개 분봉 · KST</p></>
}
