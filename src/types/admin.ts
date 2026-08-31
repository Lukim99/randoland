export type AdminRole = 'owner' | 'operator'
export type AdminLeagueStatus = 'draft' | 'registration' | 'active' | 'finished' | 'archived'
export type AdminStockStatus = 'pending' | 'active' | 'halted' | 'delisted' | 'rejected'
export type AdminStockRoundAction = 'normal' | 'halt' | 'delist'

export interface AdminAccess {
  isAdmin: boolean
  role: AdminRole | null
}

export interface AdminLeague {
  id: string
  name: string
  slug: string
  status: AdminLeagueStatus
  startsAt: string | null
  endsAt: string | null
  joinClosesAt: string | null
  listingClosesAt: string | null
  participantCount: number
  stockCount: number
  activeStockCount: number
  roundCount: number
}

export interface AdminParticipant {
  id: string
  leagueId: string
  userId: string
  nickname: string
  cashBalance: number
  reservedCash: number
  availableCash: number
  receivableRp: number
  attendanceTokens: number
  netWorth: number
  longMarketValue: number
  shortExposure: number
  holdings: AdminParticipantHolding[]
  joinedAt: string
  disqualifiedAt: string | null
  disqualificationReason: string | null
  activeBan: boolean
  banReason: string | null
  bannedAt: string | null
}

export interface AdminParticipantHolding {
  stockId: string
  ticker: string
  stockName: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  evaluationProfit: number
  returnPercent: number
  recoverableQuantity: number
}

export type AdminParticipantAssetType = 'rp' | 'attendance_token' | 'stock'
export type AdminParticipantAssetDirection = 'grant' | 'revoke'

export interface AdminParticipantAssetAdjustmentInput {
  participantId: string
  assetType: AdminParticipantAssetType
  direction: AdminParticipantAssetDirection
  amount: number
  stockId: string | null
  reason: string
  requestKey: string
}

export interface AdminStock {
  id: string
  leagueId: string
  ticker: string
  name: string
  description: string
  theme: string
  initialPrice: number
  currentPrice: number
  status: AdminStockStatus
  isBaseStock: boolean
  listedAt: string | null
  ownerParticipantId: string | null
  ownerNickname: string | null
  logoSpriteIndex: number
  logoImagePath: string | null
  logoImageUrl: string | null
  activationRoundNumber: number | null
  activationRequestedAt: string | null
  updatedAt: string
  totalPlanCount: number
  completedPlanCount: number
  articleCount: number
  missingPlanCount: number
}

export interface AdminAuditEntry {
  id: number
  action: string
  targetType: string
  targetId: string | null
  details: Record<string, unknown>
  createdAt: string
}

export type AdminOpenOrderSide = 'buy' | 'sell' | 'short' | 'cover'
export type AdminOpenOrderStatus = 'executed'

export interface AdminOpenOrder {
  id: string
  leagueId: string
  leagueName: string
  participantId: string
  participantNickname: string
  stockId: string
  ticker: string
  stockName: string
  side: AdminOpenOrderSide
  status: AdminOpenOrderStatus
  requestedQuantity: number
  orderPrice: number
  leveragePercent: number
  roundNumber: number
  submittedAt: string
  executedAt: string
}

export interface AdminConsoleState {
  role: AdminRole
  leagues: AdminLeague[]
  participants: AdminParticipant[]
  stocks: AdminStock[]
  openOrders: AdminOpenOrder[]
  auditLog: AdminAuditEntry[]
}

export interface AdminSettlementRound {
  id: string
  roundNumber: number
  status: 'scheduled' | 'open' | 'locked' | 'settling' | 'failed'
  opensAt: string
  settlesAt: string
  isEarly: boolean
  waitingOrderCount: number
  runStatus: 'generating' | 'completed' | 'failed' | null
  runClaimedAt: string | null
  recoverableAt: string | null
}

export interface AdminSettlementState {
  serverTime: string
  leagueId: string
  leagueName: string
  canExecute: boolean
  blockedReason: string | null
  activeStockCount: number
  missingPlanCount: number
  missingPlanStocks: Array<{ stockId: string; ticker: string; name: string }>
  globalNewsReady: boolean
  round: AdminSettlementRound | null
}

export interface AdminSettlementInput {
  leagueId: string
  requestKey: string
}

export interface CreateLeagueInput {
  name: string
  slug: string
  startsOn: string
  endsOn: string
}

export interface AdminStockListingInput {
  leagueId: string
  ownerParticipantId: string | null
  ticker: string
  name: string
  initialPrice: number
  description: string
  theme: string
  logoSpriteIndex: number
  logoFile: File | null
}

export interface AdminStockDetailsInput {
  stockId: string
  expectedUpdatedAt: string
  ownerParticipantId: string | null
  ticker: string
  name: string
  initialPrice: number
  description: string
  theme: string
  logoSpriteIndex: number
  logoImagePath: string | null
  logoFile: File | null
}

export interface AdminStockRoundPlan {
  roundNumber: number
  roundAction: AdminStockRoundAction
  changePercent: number | null
  dividendRpPerShare: number | null
  newsHeadline: string | null
  newsBody: string | null
  updatedAt: string
  roundStatus: 'scheduled' | 'open' | 'locked' | 'settling' | 'settled' | 'failed' | null
  editable: boolean
}

export interface AdminStockEditor {
  stock: Omit<AdminStock, 'totalPlanCount' | 'completedPlanCount' | 'articleCount' | 'missingPlanCount'> & {
    identityEditable: boolean
  }
  league: Pick<AdminLeague, 'id' | 'name' | 'status' | 'startsAt' | 'endsAt'>
  roundCount: number
  currentRoundNumber: number | null
  plans: AdminStockRoundPlan[]
}

export interface AdminGlobalNewsRoundPlan {
  roundNumber: number
  headline: string | null
  body: string | null
  updatedAt: string | null
  roundStatus: 'scheduled' | 'open' | 'locked' | 'settling' | 'settled' | 'failed' | null
  complete: boolean
  editable: boolean
}

export interface AdminGlobalNewsEditor {
  league: Pick<AdminLeague, 'id' | 'name' | 'status' | 'startsAt' | 'endsAt'>
  roundCount: number
  currentRoundNumber: number | null
  plans: AdminGlobalNewsRoundPlan[]
}

export type AdminActionRunner = (
  action: () => Promise<unknown>,
  successMessage: string,
) => Promise<boolean>
