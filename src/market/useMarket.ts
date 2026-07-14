import { useContext } from 'react'
import { MarketContext } from './market-context'

export function useMarket() {
  const context = useContext(MarketContext)

  if (!context) {
    throw new Error('useMarket must be used inside MarketProvider')
  }

  return context
}
