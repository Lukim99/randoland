export type LeagueStatus = 'registration' | 'active' | 'finished'
export type RoundStatus = 'scheduled' | 'open' | 'locked' | 'settling' | 'settled' | 'failed'
export type OrderSide = 'buy' | 'sell'
export type OrderStatus = 'pending' | 'cancelled' | 'locked' | 'executed' | 'rejected'

export interface CandlePoint {
  id?: string
  roundNumber?: number
  time: string
  open: number
  high: number
  low: number
  close: number
  changePercent?: number
}

export interface LeagueSummary {
  id: string
  name: string
  slug: string
  status: LeagueStatus
  startsAt: string | null
  endsAt: string | null
  initialBalance: number
  timezone: string
  settlementHour: number
}

export interface RoundSummary {
  id: string
  number: number
  opensAt: string
  locksAt: string
  settlesAt: string
  status: RoundStatus
  settledAt: string | null
}

export interface StockSummary {
  id: string
  ticker: string
  name: string
  description: string
  theme: string
  owner: string
  listedBy?: string | null
  initialPrice: number
  previousClose: number
  currentPrice: number
  changePercent: number
  isBaseStock: boolean
  status: 'active' | 'halted' | 'delisted'
  listedAt: string | null
  candles: CandlePoint[]
}

export interface MarketNews {
  id: string
  stockId: string
  ticker: string
  stockName: string
  headline: string
  summary: string
  body: string
  sentiment: number
  publishedAt: string
  roundNumber: number
}

export interface MarketSnapshot {
  serverTime: string
  league: LeagueSummary | null
  round: RoundSummary | null
  stocks: StockSummary[]
  news: MarketNews[]
}

export interface ParticipantSummary {
  id: string
  nickname: string
  cashBalance: number
  reservedCash: number
  availableCash: number
  attendanceTokens: number
  completedTradeCycles: number
  longestHoldingRounds: number
  joinedAt: string
  disqualifiedAt: string | null
  portfolioGrossValue: number
  projectedLiabilities: number
  netWorth: number
  attendedToday: boolean
  attendanceDate: string
  ladderStreak: number
}

export interface PositionSummary {
  id: string
  stockId: string
  ticker: string
  stockName: string
  quantity: number
  averagePrice: number
  currentPrice: number
  grossValue: number
  leveragePrincipal: number
  projectedLeverageFee: number
  netValue: number
  holdingRounds: number
  openedRoundId: string | null
}

export interface OrderSummary {
  id: string
  stockId: string
  ticker: string
  stockName: string
  roundNumber: number
  side: OrderSide
  status: OrderStatus
  cashAmount: number | null
  quantity: number | null
  leverageAmount: number
  reservedCash: number
  reservedQuantity: number
  executionPrice: number | null
  executedQuantity: number | null
  rejectionReason: string | null
  submittedAt: string
  cancelledAt: string | null
  executedAt: string | null
}

export interface LedgerEntry {
  id: string
  roundId: string | null
  type: string
  amount: number
  balanceAfter: number
  referenceType: string | null
  referenceId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface TradeCycle {
  id: string
  stockId: string
  ticker: string
  stockName: string
  openedRoundNumber: number
  closedRoundNumber: number | null
  investedAmount: number
  returnedAmount: number | null
  realizedProfit: number | null
  holdingRounds: number
  status: 'open' | 'closed'
  openedAt: string
  closedAt: string | null
}

export interface LadderGame {
  id: string
  choice: 'odd' | 'even'
  result: 'odd' | 'even'
  won: boolean
  streakBefore: number
  streakAfter: number
  reward: number
  playedAt: string
}

export interface ListingStory {
  weekNumber: number
  story: string
}

export interface MyListing {
  id: string
  ticker: string
  name: string
  description: string
  theme: string
  initialPrice: number
  currentPrice: number
  status: string
  listedAt: string | null
  stories: ListingStory[]
}

export interface PersonalRank {
  rank: number
  netWorth: number
  returnPercent: number
  eligibleForPrize: boolean
  roundNumber: number
  publishedAt: string
}

export interface MyState {
  joined: boolean
  serverTime: string
  participant: ParticipantSummary | null
  positions: PositionSummary[]
  orders: OrderSummary[]
  ledger: LedgerEntry[]
  tradeCycles: TradeCycle[]
  ladderGames: LadderGame[]
  listing: MyListing | null
  latestRank: PersonalRank | null
}

export interface RankingEntry {
  rank: number
  nickname: string
  netWorth: number
  returnPercent: number
  eligibleForPrize: boolean
  completedTradeCycles: number
  longestHoldingRounds: number
}

export type LeagueAwardCode =
  | 'prize_1'
  | 'prize_2'
  | 'prize_3'
  | 'short_term'
  | 'contrarian'
  | 'diamond_hands'

export interface LeagueAward {
  code: LeagueAwardCode
  label: string
  placement: number | null
  nickname: string
  metricValue: number | null
  selectedAt: string
}

export interface RankingsSnapshot {
  roundNumber: number | null
  publishedAt: string | null
  isFinal: boolean
  rankings: RankingEntry[]
  awards: LeagueAward[]
}

export interface ListingSubmission {
  ticker: string
  name: string
  initialPrice: number
  description: string
  theme: string
  weeklyStories: string[]
}

export interface LadderResult {
  id: string
  choice: 'odd' | 'even'
  result: 'odd' | 'even'
  won: boolean
  streakBefore: number
  streakAfter: number
  reward: number
  cashBalance: number
  tokens: number
}
