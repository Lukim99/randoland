export interface LoanSettings {
  enabled: boolean
  opensAt: string
  closesAt: string
  principalLimit: number
  termDays: number
  interestPercent: number
  version: string
}

export interface Loan {
  id: string
  principal: number
  interest: number
  repaymentAmount: number
  interestPercent: number
  termDays: number
  borrowedAt: string
  dueAt: string
  repaidAt: string | null
  cashApplied: number | null
  receivableCreated: number | null
  nickname?: string
}

export interface LoanState {
  serverTime: string
  settings: LoanSettings | null
  isOpen: boolean
  outstandingPrincipal: number
  outstandingInterest: number
  available: number
  loans: Loan[]
}
