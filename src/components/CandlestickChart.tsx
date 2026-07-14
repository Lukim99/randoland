import { useEffect, useRef } from 'react'
import { CandlestickSeries, ColorType, createChart, type Time } from 'lightweight-charts'
import type { CandlePoint } from '../types/market'

interface CandlestickChartProps {
  candles: CandlePoint[]
  label: string
  height?: number
}

export function CandlestickChart({ candles, label, height = 330 }: CandlestickChartProps) {
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
        timeVisible: false,
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

    series.setData(
      candles.map((candle) => ({
        ...candle,
        time: candle.time as Time,
      })),
    )
    chart.timeScale().fitContent()

    const observer = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: Math.floor(entry.contentRect.width) })
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.remove()
    }
  }, [candles, height])

  return (
    <div className="chart-wrap" aria-label={`${label} 일봉 캔들 차트`}>
      <div ref={containerRef} className="candlestick-chart" />
      {candles.length === 0 && (
        <div className="chart-empty">
          <strong>첫 캔들을 기다리고 있습니다</strong>
          <span>첫 일일 정산 후 가격 흐름이 표시됩니다.</span>
        </div>
      )}
      <span className="sr-only">
        {label}의 최근 {candles.length}개 라운드 시가, 고가, 저가, 종가 차트
      </span>
    </div>
  )
}
