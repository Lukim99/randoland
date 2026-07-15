export type AdminRole = 'owner' | 'operator'
export type AdminLeagueStatus = 'draft' | 'registration' | 'active' | 'finished' | 'archived'
export type AdminStockStatus = 'pending' | 'active' | 'halted' | 'delisted' | 'rejected'

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
}

export interface AdminParticipant {
  id: string
  leagueId: string
  userId: string
  nickname: string
  cashBalance: number
  reservedCash: number
  receivableRp: number
  joinedAt: string
  disqualifiedAt: string | null
  disqualificationReason: string | null
  activeBan: boolean
  banReason: string | null
  bannedAt: string | null
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
}

export interface AdminGlobalEvent {
  id: string
  leagueId: string
  weekNumber: number
  title: string
  scenario: string
  intensity: number
  isActive: boolean
  updatedAt: string
}

export interface AdminAuditEntry {
  id: number
  action: string
  targetType: string
  targetId: string | null
  details: Record<string, unknown>
  createdAt: string
}

export interface AdminConsoleState {
  role: AdminRole
  leagues: AdminLeague[]
  participants: AdminParticipant[]
  stocks: AdminStock[]
  events: AdminGlobalEvent[]
  auditLog: AdminAuditEntry[]
}

export interface AdminManualSettlementRound {
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

export interface AdminManualSettlementStock {
  id: string
  ticker: string
  name: string
  currentPrice: number
}

export interface AdminManualSettlementState {
  serverTime: string
  leagueId: string
  leagueName: string
  canExecute: boolean
  blockedReason: string | null
  round: AdminManualSettlementRound | null
  stocks: AdminManualSettlementStock[]
}

export interface AdminManualSettlementPriceItem {
  stockId: string
  sentiment: number
  eventStrength: number
  changePercent: number
}

export interface AdminManualSettlementBrief {
  headline: string
  summary: string
  affectedStockIds: string[]
}

export interface AdminManualSettlementInput {
  leagueId: string
  roundId: string
  requestKey: string
  priceItems: AdminManualSettlementPriceItem[]
  mainArticle: {
    headline: string
    summary: string
    body: string
  }
  briefs: AdminManualSettlementBrief[]
}

export interface CreateLeagueInput {
  name: string
  slug: string
  startsOn: string
  endsOn: string
}

export interface UpsertGlobalEventInput {
  leagueId: string
  weekNumber: number
  title: string
  scenario: string
  intensity: number
  isActive: boolean
}

export interface AdminStockListingInput {
  leagueId: string
  ticker: string
  name: string
  initialPrice: number
  description: string
  theme: string
  weeklyStories: string[]
  logoSpriteIndex: number
}

export type AdminActionRunner = (
  action: () => Promise<unknown>,
  successMessage: string,
) => Promise<boolean>
