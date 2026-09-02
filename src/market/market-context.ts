import { createContext } from 'react'
import type {
  DiscussionComment,
  DiscussionPost,
  DiscussionAttachmentInput,
  DiscussionSort,
  LadderChoice,
  LadderResult,
  MarketSnapshot,
  MyState,
  NewsFeed,
  OrderCapacity,
  OrderSide,
  RecentDiscussionPost,
  RankingsSnapshot,
} from '../types/market'

export interface MarketContextValue {
  market: MarketSnapshot | null
  myState: MyState | null
  rankings: RankingsSnapshot | null
  newsFeed: NewsFeed | null
  favoriteStockIds: string[]
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
  uploadProfileImage: (file: File) => Promise<void>
  loadRecentDiscussionPosts: (leagueId: string, limit?: number) => Promise<RecentDiscussionPost[]>
  loadDiscussionPosts: (stockId: string, sort?: DiscussionSort) => Promise<DiscussionPost[]>
  createDiscussionPost: (
    stockId: string,
    title: string,
    content: string,
    attachment: DiscussionAttachmentInput | null,
  ) => Promise<DiscussionPost>
  setStockFavorite: (stockId: string, favorited: boolean) => Promise<void>
  setDiscussionPostLike: (postId: string, liked: boolean) => Promise<{ postId: string; liked: boolean; likeCount: number }>
  createDiscussionComment: (postId: string, content: string) => Promise<DiscussionComment>
  deleteDiscussionPost: (postId: string) => Promise<{ postId: string; stockId: string; deleted: true }>
  deleteDiscussionComment: (commentId: string) => Promise<{ commentId: string; postId: string; deleted: true }>
  claimAttendance: () => Promise<{ date: string; awarded: boolean; tokens: number }>
  playLadder: (choice: LadderChoice) => Promise<LadderResult>
  chooseLadderAction: (gameId: string, action: 'go' | 'stop') => Promise<LadderResult>
  playLadderSecond: (gameId: string, choice: LadderChoice) => Promise<LadderResult>
  chooseLadderThirdAction: (gameId: string, action: 'go' | 'stop') => Promise<LadderResult>
  playLadderThird: (gameId: string, choice: LadderChoice) => Promise<LadderResult>
}

export const MarketContext = createContext<MarketContextValue | null>(null)
