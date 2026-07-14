import { createContext } from 'react'
import type {
  LadderResult,
  ListingSubmission,
  MarketSnapshot,
  MyState,
  OrderSide,
  RankingsSnapshot,
} from '../types/market'

export interface MarketContextValue {
  market: MarketSnapshot | null
  myState: MyState | null
  rankings: RankingsSnapshot | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
  joinCurrentLeague: () => Promise<void>
  placeOrder: (
    stockId: string,
    side: OrderSide,
    quantity: number,
    leveragePercent: number,
  ) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
  submitListing: (submission: ListingSubmission) => Promise<void>
  setProfileSprite: (profileSpriteIndex: number) => Promise<void>
  setStockLogo: (stockId: string, logoSpriteIndex: number) => Promise<void>
  claimAttendance: () => Promise<{ date: string; awarded: boolean; tokens: number }>
  playLadder: (choice: 'odd' | 'even') => Promise<LadderResult>
}

export const MarketContext = createContext<MarketContextValue | null>(null)
