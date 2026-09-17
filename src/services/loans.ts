import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Loan, LoanSettings, LoanState } from '../types/loans'
import { readableSupabaseError } from './market'

export class LoanRequestError extends Error {
  readonly uncertain: boolean

  constructor(error: PostgrestError) {
    super(readableSupabaseError(error))
    this.uncertain = !error.code || error.code.startsWith('PGRST')
  }
}

function client() {
  if (!supabase) throw new Error('서버 연결 정보가 없습니다.')
  return supabase
}

export async function loadLoanState(leagueId: string, admin = false): Promise<LoanState> {
  const { data, error } = await client().rpc(admin ? 'randoland_admin_get_loan_state' : 'randoland_get_loan_state', { p_league_id: leagueId })
  if (error) throw new LoanRequestError(error)
  return data as LoanState
}

export async function borrowLoan(leagueId: string, amount: number, version: string, requestKey: string): Promise<Loan> {
  const { data, error } = await client().rpc('randoland_borrow_loan', {
    p_league_id: leagueId, p_amount: amount, p_settings_version: version, p_request_key: requestKey,
  })
  if (error) throw new LoanRequestError(error)
  return data as Loan
}

export async function saveLoanSettings(leagueId: string, settings: Omit<LoanSettings, 'version'>, expectedVersion: string | null, requestKey: string): Promise<LoanSettings> {
  const { data, error } = await client().rpc('randoland_admin_save_loan_settings', {
    p_league_id: leagueId, p_enabled: settings.enabled, p_opens_at: settings.opensAt, p_closes_at: settings.closesAt,
    p_principal_limit: settings.principalLimit, p_term_days: settings.termDays, p_interest_percent: settings.interestPercent,
    p_expected_version: expectedVersion, p_request_key: requestKey,
  })
  if (error) throw new LoanRequestError(error)
  return data as LoanSettings
}

// Match the server's fixed interest, rounded up to a whole RP without floating point drift.
export function loanInterest(principal: number, percent: number) {
  if (!Number.isSafeInteger(principal) || principal <= 0) return 0
  const scaledRate = BigInt(Math.round(percent * 10000))
  return Number((BigInt(principal) * scaledRate + 999999n) / 1000000n)
}
