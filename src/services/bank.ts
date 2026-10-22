import { supabase } from '../lib/supabase'
import type { BankKind, BankState, BankTerms, LeverageSettings } from '../types/bank'
import { LoanRequestError } from './loans'

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('서버 연결 정보가 없습니다.')
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new LoanRequestError(error)
  return data as T
}

export function loadBankState(leagueId: string, admin = false) {
  return rpc<BankState>(admin ? 'randoland_admin_get_bank_state' : 'randoland_get_bank_state', { p_league_id: leagueId })
}

export function saveBankProduct(leagueId: string, productId: string | null, kind: BankKind, terms: BankTerms, expectedVersion: string | null, requestKey: string) {
  return rpc('randoland_admin_save_bank_product', { p_league_id: leagueId, p_product_id: productId, p_kind: kind, p_terms: terms, p_expected_version: expectedVersion, p_request_key: requestKey })
}

export function transactBank(leagueId: string, productId: string, action: 'subscribe' | 'redeem', amount: number, version: string, requestKey: string) {
  return rpc('randoland_bank_transaction', { p_league_id: leagueId, p_product_id: productId, p_action: action, p_amount: amount, p_version: version, p_request_key: requestKey })
}

export function loadLeverageSettings(leagueId: string) {
  return rpc<LeverageSettings>('randoland_admin_get_leverage_settings', { p_league_id: leagueId })
}

export function saveLeverageSettings(leagueId: string, percent: number, requestKey: string) {
  return rpc('randoland_admin_save_leverage_settings', { p_league_id: leagueId, p_percent: percent, p_request_key: requestKey })
}

export function savingsMaturity(principal: number, percent: number) {
  const rate = BigInt(Math.round(percent * 10000))
  return principal + Number(BigInt(principal) * rate / 1000000n)
}
