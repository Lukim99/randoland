import { Link } from 'react-router'

interface BrandProps {
  compact?: boolean
  to?: string
}

export function Brand({ compact = false, to = '/' }: BrandProps) {
  return (
    <Link className={`brand${compact ? ' brand--compact' : ''}`} to={to} aria-label="란도랜드2 홈">
      <img src="/assets/randoland-mark.svg" width="40" height="40" alt="" />
      <span className="brand__copy">
        <strong>란도랜드2</strong>
        {!compact && <small>모의 주식시장 리그</small>}
      </span>
    </Link>
  )
}
