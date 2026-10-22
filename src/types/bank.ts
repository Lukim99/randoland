export type BankKind = 'savings' | 'fund'
export interface BankTerms {
  name: string
  description: string
  enabled: boolean
  opensAt: string
  closesAt: string
  maxPrincipal: number
  interestPercent?: number
  lockDays?: number
  risk?: 'low' | 'medium' | 'high'
  startRound?: number
  endRound?: number
  roundReturns?: Record<string, number>
}
export interface BankProduct {
  id: string
  leagueId: string
  kind: BankKind
  version: string
  terms: BankTerms
  pendingTerms: BankTerms | null
  effectiveRound: number | null
}
export interface BankHolding {
  id: string
  productId: string
  principal: number
  initialPrincipal: number
  balance: number
  subscribedAt: string
  dueAt: string | null
  interestPercent: number | null
  lockDays: number | null
  status: 'active' | 'redeemed' | 'matured'
  closedAt: string | null
  paidAmount: number
  lastRound: number | null
  lastReturnPercent: number | null
}
export interface BankState {
  serverTime: string
  currentRound: number
  roundCount: number
  products: BankProduct[]
  holdings: BankHolding[]
}
export interface LeverageSettings {
  currentPercent: number
  nextRound: number
  pending: { percent: number; effectiveRound: number; version: string } | null
}
