import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type {
  AdminAccess,
  AdminAiSettlementInput,
  AdminAiSettlementState,
  AdminConsoleState,
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

async function throwIfFunctionError(error: { message: string } | null) {
  if (!error) return

  let functionMessage: string | null = null
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json() as { error?: unknown; message?: unknown }
      if (typeof payload.error === 'string') functionMessage = payload.error
      else if (typeof payload.message === 'string') functionMessage = payload.message
    } catch {
      functionMessage = null
    }
  }

  throw new Error(readableSupabaseError(functionMessage ?? error.message))
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

export async function loadAdminAiSettlementState(
  leagueId: string,
): Promise<AdminAiSettlementState> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_admin_console_get_ai_settlement_state', {
    p_league_id: leagueId,
  })
  throwIfError(error)

  return data as unknown as AdminAiSettlementState
}

export async function runAdminAiSettlement(input: AdminAiSettlementInput) {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('randoland-daily-settlement', {
    body: {
      mode: 'admin_now',
      leagueId: input.leagueId,
      requestKey: input.requestKey,
    },
  })
  await throwIfFunctionError(error)

  const result = data as {
    status?: string
    error?: string
    recoverableAt?: string
  } | null

  if (result?.status === 'busy') {
    throw new Error('AI 정산이 이미 진행 중입니다. 15분 이상 응답이 없을 때 다시 시도해 주세요.')
  }
  if (result?.status === 'idle') {
    throw new Error('정산 가능한 현재 라운드가 없습니다.')
  }
  if (result?.status === 'failed') {
    throw new Error(result.error || 'AI 정산을 완료하지 못했습니다.')
  }
  if (result?.status !== 'completed') {
    throw new Error('AI 정산 결과를 확인할 수 없습니다.')
  }

  return data
}
