import { SpriteIcon } from './SpriteIcon'

type StockLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface StockLogoProps {
  src?: string | null
  spriteIndex: number
  size?: StockLogoSize
  label: string
  className?: string
}

export function StockLogo({ src, spriteIndex, size = 'md', label, className }: StockLogoProps) {
  if (!src) {
    return <SpriteIcon kind="stock" index={spriteIndex} size={size} label={label} className={className} />
  }

  const classes = ['sprite-icon', 'sprite-icon--stock', `sprite-icon--${size}`, 'stock-logo-image', className]
    .filter(Boolean)
    .join(' ')

  return <img className={classes} src={src} alt={label} />
}
