import { supabase } from '../lib/supabase'
import type {
  AdminAccess,
  AdminConsoleState,
  AdminManualSettlementInput,
  AdminManualSettlementState,
  AdminStockListingInput,
  CreateLeagueInput,
  UpsertGlobalEventInput,
} from '../types/admin'
import { readableSupabaseError } from './market'

const STOCK_LOGO_BUCKET = 'randoland-stock-logos'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase 연결 정보가 설정되지 않았습니다.')
  return supabase
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(readableSupabaseError(error.message))
}

export function createAdminRequestKey() {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()

  const bytes = new Uint8Array(16)
  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes)
  } else {
    const seed = Date.now()
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256) ^ ((seed >> (index % 6)) & 0xff)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function loadAdminAccess(): Promise<AdminAccess> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_access')
  throwIfError(error)
  return data as unknown as AdminAccess
}

export async function loadAdminConsole(): Promise<AdminConsoleState> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_get_state')
  throwIfError(error)

  const state = data as unknown as AdminConsoleState
  return {
    ...state,
    leagues: state.leagues ?? [],
    participants: state.participants ?? [],
    stocks: (state.stocks ?? []).map((stock) => ({
      ...stock,
      logoImageUrl: stock.logoImagePath
        ? client.storage.from(STOCK_LOGO_BUCKET).getPublicUrl(stock.logoImagePath).data.publicUrl
        : null,
    })),
    events: state.events ?? [],
    auditLog: state.auditLog ?? [],
  }
}

export async function createAdminLeague(input: CreateLeagueInput) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_create_league', {
    p_name: input.name,
    p_slug: input.slug,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn,
  })
  throwIfError(error)
  return data
}

export async function stopAdminLeague(leagueId: string, reason: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_stop_league', {
    p_league_id: leagueId,
    p_reason: reason,
  })
  throwIfError(error)
  return data
}

export async function disqualifyAdminParticipant(
  participantId: string,
  reason: string,
  banFuture: boolean,
) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_disqualify_participant', {
    p_participant_id: participantId,
    p_reason: reason,
    p_ban_future: banFuture,
  })
  throwIfError(error)
  return data
}

export async function revokeAdminBan(userId: string, reason: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_revoke_ban', {
    p_user_id: userId,
    p_reason: reason,
  })
  throwIfError(error)
  return data
}

export async function upsertAdminGlobalEvent(input: UpsertGlobalEventInput) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_upsert_global_event', {
    p_league_id: input.leagueId,
    p_week_number: input.weekNumber,
    p_title: input.title,
    p_scenario: input.scenario,
    p_intensity: input.intensity,
    p_is_active: input.isActive,
  })
  throwIfError(error)
  return data
}

export async function listAdminStock(input: AdminStockListingInput) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_list_stock', {
    p_league_id: input.leagueId,
    p_ticker: input.ticker,
    p_name: input.name,
    p_initial_price: input.initialPrice,
    p_description: input.description,
    p_theme: input.theme,
    p_weekly_stories: input.weeklyStories,
    p_logo_sprite_index: input.logoSpriteIndex,
  })
  throwIfError(error)
  return data
}

export async function delistAdminStock(stockId: string, reason: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_delist_stock', {
    p_stock_id: stockId,
    p_reason: reason,
  })
  throwIfError(error)
  return data
}

export async function loadAdminManualSettlementState(
  leagueId: string,
): Promise<AdminManualSettlementState> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_get_manual_settlement_state', {
    p_league_id: leagueId,
  })
  throwIfError(error)

  const state = data as unknown as AdminManualSettlementState
  return { ...state, stocks: state.stocks ?? [] }
}

export async function finalizeAdminRoundNow(input: AdminManualSettlementInput) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_finalize_round_now', {
    p_league_id: input.leagueId,
    p_round_id: input.roundId,
    p_request_key: input.requestKey,
    p_price_items: input.priceItems,
    p_main_article: input.mainArticle,
    p_briefs: input.briefs,
  })
  throwIfError(error)
  return data
}
