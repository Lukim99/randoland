import type { CSSProperties } from 'react'
import stockLogosSprite from '../assets/stocklogos.png'
import { normalizeSpriteIndex } from '../lib/sprites'

export type SpriteKind = 'stock'
type SpriteSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface SpriteIconProps {
  kind: SpriteKind
  index: number
  size?: SpriteSize
  label?: string
  className?: string
}

export function SpriteIcon({ kind, index, size = 'md', label, className }: SpriteIconProps) {
  const normalizedIndex = normalizeSpriteIndex(index)
  const column = normalizedIndex % 10
  const row = Math.floor(normalizedIndex / 10)
  const backgroundPosition = `${(column / 9) * 100}% ${(row / 9) * 100}%`
  const classes = ['sprite-icon', `sprite-icon--${kind}`, `sprite-icon--${size}`, className]
    .filter(Boolean)
    .join(' ')
  const style: CSSProperties = {
    backgroundImage: `url(${stockLogosSprite})`,
    backgroundPosition,
  }

  return (
    <span
      className={classes}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
