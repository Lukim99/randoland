import { useId } from 'react'
import type { CandlePoint } from '../types/market'

interface MiniCandlesProps {
  candles: CandlePoint[]
  label: string
}

export function MiniCandles({ candles, label }: MiniCandlesProps) {
  const titleId = useId()
  const points = candles.slice(-9)
  const values = points.flatMap((point) => [point.high, point.low])
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(1, max - min)
  const y = (value: number) => 3 + ((max - value) / range) * 30

  return (
    <svg className="mini-candles" viewBox="0 0 90 36" role="img" aria-labelledby={titleId}>
      <title id={titleId}>{label} 미니 캔들 차트</title>
      {points.map((point, index) => {
        const x = 5 + index * 10
        const isUp = point.close >= point.open
        const bodyTop = y(Math.max(point.open, point.close))
        const bodyBottom = y(Math.min(point.open, point.close))
        const color = isUp ? '#FF4D5E' : '#3B82F6'
        return (
          <g key={point.time}>
            <line x1={x} y1={y(point.high)} x2={x} y2={y(point.low)} stroke={color} strokeWidth="1" />
            <rect
              x={x - 2.5}
              y={bodyTop}
              width="5"
              height={Math.max(2, bodyBottom - bodyTop)}
              rx="0.75"
              fill={color}
            />
          </g>
        )
      })}
    </svg>
  )
}
