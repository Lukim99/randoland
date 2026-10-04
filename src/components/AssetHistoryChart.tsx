import { useEffect, useId, useRef, useState } from 'react'
import { ColorType, createChart, LineSeries, type Time } from 'lightweight-charts'
import { formatAssetDate } from '../lib/asset-history'
import { formatKstDateTime, formatPrice, formatRp, movementClass } from '../lib/format'
import type { AssetHistoryPoint } from '../types/market'

export function AssetHistoryChart({ points, nickname }: { points: AssetHistoryPoint[]; nickname: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(points.length - 1)
  const rangeId = useId()
  const selected = points[Math.min(selectedIndex, points.length - 1)]
  const previous = points[Math.min(selectedIndex, points.length - 1) - 1]
  const difference = previous ? selected.netWorth - previous.netWorth : null

  useEffect(() => {
    const container = containerRef.current
    if (!container || points.length === 0) return
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 280,
      layout: { background: { type: ColorType.Solid, color: '#0B0F0E' }, textColor: '#92A49D', fontFamily: 'Pretendard, system-ui, sans-serif' },
      grid: { vertLines: { color: '#17221E' }, horzLines: { color: '#17221E' } },
      rightPriceScale: { borderColor: '#24352E', scaleMargins: { top: 0.16, bottom: 0.16 } },
      timeScale: { borderColor: '#24352E', timeVisible: false, rightOffset: 1 },
      localization: { locale: 'ko-KR', priceFormatter: formatPrice, dateFormat: 'yyyy.MM.dd' },
      crosshair: { vertLine: { labelBackgroundColor: '#24352E' }, horzLine: { labelBackgroundColor: '#24352E' } },
      handleScroll: false,
      handleScale: false,
    })
    const series = chart.addSeries(LineSeries, {
      color: '#00FFBF', lineWidth: 2, pointMarkersVisible: true, pointMarkersRadius: 3,
      lastValueVisible: false, priceLineVisible: false,
      priceFormat: { type: 'custom', formatter: formatPrice, minMove: 1 },
    })
    series.setData(points.map((point) => ({ time: point.date as Time, value: point.netWorth })))
    chart.timeScale().fitContent()
    const handleCrosshairMove: Parameters<typeof chart.subscribeCrosshairMove>[0] = (event) => {
      const data = event.seriesData.get(series)
      if (!data) return
      const time = data.time
      const date = typeof time === 'object'
        ? `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`
        : time
      const index = points.findIndex((point) => point.date === date)
      if (index >= 0) setSelectedIndex(index)
    }
    chart.subscribeCrosshairMove(handleCrosshairMove)
    const observer = new ResizeObserver(([entry]) => chart.applyOptions({ width: Math.floor(entry.contentRect.width) }))
    observer.observe(container)
    return () => {
      observer.disconnect()
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      chart.remove()
    }
  }, [points])

  if (!selected) return null

  return (
    <div className="asset-history-chart">
      <div className="asset-history-chart__readout" aria-live="polite" aria-atomic="true">
        <div><span>{formatAssetDate(selected.date)}</span><strong>{formatRp(selected.netWorth)}</strong></div>
        <div><span>직전 기록 대비</span><strong className={difference === null ? '' : movementClass(difference)}>{difference === null ? '첫 기록' : `${difference > 0 ? '+' : ''}${formatRp(difference)}`}</strong></div>
      </div>
      <div ref={containerRef} className="asset-history-chart__canvas" role="group" aria-label={`${nickname}의 순자산 추이 차트. 정확한 값은 아래 일자별 기록 표에서 확인할 수 있습니다.`} />
      {points.length > 1 ? (
        <div className="asset-history-chart__selector">
          <label htmlFor={rangeId}>날짜 선택</label>
          <input id={rangeId} type="range" min="0" max={points.length - 1} value={selectedIndex}
            aria-valuetext={`${formatAssetDate(selected.date)}, ${formatRp(selected.netWorth)}`}
            onChange={(event) => setSelectedIndex(Number(event.target.value))} />
          <span>{selectedIndex + 1} / {points.length}</span>
        </div>
      ) : <p className="asset-history-note">기록이 1일만 있어 점으로 표시합니다.</p>}
      <details className="asset-history-table">
        <summary>일자별 기록 보기 <span>{points.length}일</span></summary>
        <div className="asset-history-table__scroll" tabIndex={0} role="region" aria-label={`${nickname} 일자별 자산 기록`}>
          <table>
            <caption className="sr-only">{nickname}의 KST 날짜별 순자산과 기준 시각</caption>
            <thead><tr><th scope="col">날짜 (KST)</th><th scope="col">순자산</th><th scope="col">직전 기록 대비</th></tr></thead>
            <tbody>{points.map((point, index) => {
              const change = index > 0 ? point.netWorth - points[index - 1].netWorth : null
              const cutoff = point.kind === 'day_end' ? '일 마감 기준 (KST)'
                : point.kind === 'correction' ? `정정 반영 · ${formatKstDateTime(point.asOf)} KST`
                  : `${point.roundNumber}라운드 · ${formatKstDateTime(point.asOf)} KST`
              return <tr key={point.date}><th scope="row"><span>{formatAssetDate(point.date)}</span><small>{cutoff}</small></th><td>{formatRp(point.netWorth)}</td><td className={change === null ? '' : movementClass(change)}>{change === null ? '첫 기록' : `${change > 0 ? '+' : ''}${formatRp(change)}`}</td></tr>
            })}</tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
