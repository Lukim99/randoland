import { useEffect, useRef } from 'react'
import { CandlestickSeries, ColorType, createChart, type Time, type UTCTimestamp } from 'lightweight-charts'
import { formatPercent, formatPrice, movementClass } from '../lib/format'
import type { CandlePoint } from '../types/market'

interface CandlestickChartProps {
  candles: CandlePoint[]
  label: string
  height?: number
  interval?: 'day' | 'minute'
}

function chartTimeKey(time: Time): string | null {
  if (typeof time === 'string') return time

  if (typeof time === 'number') {
    return String(time)
  }

  if ('year' in time && 'month' in time && 'day' in time) {
    return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`
  }

  return null
}

function formatCandleDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${year}.${month}.${day}`
}

export function CandlestickChart({ candles, label, height = 330, interval = 'day' }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || candles.length === 0) return

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0F0E' },
        textColor: '#75847F',
        fontFamily: 'Inter, Pretendard, system-ui, sans-serif',
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: 'rgba(28, 41, 37, 0.48)' },
        horzLines: { color: 'rgba(28, 41, 37, 0.62)' },
      },
      rightPriceScale: {
        borderColor: '#1C2925',
        scaleMargins: { top: 0.14, bottom: 0.12 },
      },
      timeScale: {
        borderColor: '#1C2925',
        timeVisible: interval === 'minute',
        ...(interval === 'minute' ? { tickMarkFormatter: (time: Time) => typeof time === 'number' ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(time * 1000)) : '' } : {}),
        rightOffset: 1,
        barSpacing: 21,
      },
      crosshair: {
        vertLine: { color: '#547068', labelBackgroundColor: '#17231F' },
        horzLine: { color: '#547068', labelBackgroundColor: '#17231F' },
      },
      handleScale: true,
      handleScroll: true,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#FF4D5E',
      downColor: '#3B82F6',
      borderVisible: false,
      wickUpColor: '#FF7885',
      wickDownColor: '#67A1FF',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => new Intl.NumberFormat('ko-KR').format(Math.round(price)),
        minMove: 1,
      },
    })

    const candleByTime = new Map(candles.map((candle) => [interval === 'minute' ? String(Math.floor(Date.parse(candle.time) / 1000)) : candle.time, candle]))
    const tooltip = document.createElement('div')
    const tooltipDate = document.createElement('strong')
    const tooltipClose = document.createElement('span')
    const tooltipChange = document.createElement('span')
    tooltip.className = 'candle-tooltip'
    tooltip.setAttribute('aria-hidden', 'true')
    tooltip.append(tooltipDate, tooltipClose, tooltipChange)
    container.parentElement?.append(tooltip)

    series.setData(
      candles.map((candle) => ({
        ...candle,
        time: interval === 'minute' ? Math.floor(Date.parse(candle.time) / 1000) as UTCTimestamp : candle.time as Time,
      })),
    )
    chart.timeScale().fitContent()

    const handleCrosshairMove: Parameters<typeof chart.subscribeCrosshairMove>[0] = (parameter) => {
      const timeKey = parameter.time ? chartTimeKey(parameter.time) : null
      const candle = timeKey ? candleByTime.get(timeKey) : null
      if (!parameter.point || !candle) {
        tooltip.classList.remove('is-visible')
        return
      }

      tooltipDate.textContent = interval === 'minute' ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(candle.time)) : formatCandleDate(timeKey!)
      tooltipClose.textContent = `종가 ${formatPrice(candle.close)} RP`
      tooltipChange.textContent = `등락률 ${formatPercent(candle.changePercent ?? 0)}`
      tooltipChange.className = movementClass(candle.changePercent ?? 0)
      tooltip.classList.add('is-visible')

      const tooltipWidth = tooltip.offsetWidth
      const tooltipHeight = tooltip.offsetHeight
      const left = parameter.point.x + 14 + tooltipWidth > container.clientWidth
        ? parameter.point.x - tooltipWidth - 14
        : parameter.point.x + 14
      const top = Math.min(
        Math.max(parameter.point.y - tooltipHeight / 2, 8),
        container.clientHeight - tooltipHeight - 8,
      )
      tooltip.style.left = `${Math.max(8, left)}px`
      tooltip.style.top = `${top}px`
    }
    chart.subscribeCrosshairMove(handleCrosshairMove)

    const observer = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: Math.floor(entry.contentRect.width) })
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      tooltip.remove()
      chart.remove()
    }
  }, [candles, height, interval])

  return (
    <div className="chart-wrap" aria-label={`${label} ${interval === 'minute' ? '분봉' : '일봉'} 캔들 차트`}>
      <div ref={containerRef} className="candlestick-chart" />
      {candles.length === 0 && (
        <div className="chart-empty">
          <strong>첫 캔들을 기다리고 있습니다</strong>
          <span>{interval === 'minute' ? '첫 분당 가격 갱신 후 표시됩니다.' : '첫 일일 정산 후 가격 흐름이 표시됩니다.'}</span>
        </div>
      )}
      <span className="sr-only">
        {label}의 최근 {candles.length}개 {interval === 'minute' ? '분봉' : '일봉'} 시가, 고가, 저가, 종가 차트
      </span>
    </div>
  )
}
