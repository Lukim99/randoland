import { createContext } from 'react'
import type {
  DiscussionPost,
  LadderChoice,
  LadderResult,
  ListingSubmission,
  MarketSnapshot,
  MyState,
  NewsFeed,
  OrderCapacity,
  OrderSide,
  RankingsSnapshot,
} from '../types/market'

export interface MarketContextValue {
  market: MarketSnapshot | null
  myState: MyState | null
  rankings: RankingsSnapshot | null
  newsFeed: NewsFeed | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
  joinCurrentLeague: (nickname: string) => Promise<void>
  getOrderCapacity: (
    stockId: string,
    side: OrderSide,
    leveragePercent: number,
  ) => Promise<OrderCapacity>
  placeOrder: (
    stockId: string,
    side: OrderSide,
    quantity: number,
    leveragePercent: number,
  ) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
  submitListing: (submission: ListingSubmission, logoFile?: File | null) => Promise<void>
  uploadProfileImage: (file: File) => Promise<void>
  loadDiscussionPosts: (stockId: string) => Promise<DiscussionPost[]>
  createDiscussionPost: (stockId: string, title: string, content: string) => Promise<DiscussionPost>
  claimAttendance: () => Promise<{ date: string; awarded: boolean; tokens: number }>
  playLadder: (choice: LadderChoice) => Promise<LadderResult>
  chooseLadderAction: (gameId: string, action: 'go' | 'stop') => Promise<LadderResult>
  playLadderSecond: (gameId: string, choice: LadderChoice) => Promise<LadderResult>
  chooseLadderThirdAction: (gameId: string, action: 'go' | 'stop') => Promise<LadderResult>
  playLadderThird: (gameId: string, choice: LadderChoice) => Promise<LadderResult>
}

export const MarketContext = createContext<MarketContextValue | null>(null)
