import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type {
  LadderResult,
  ListingSubmission,
  MarketSnapshot,
  MyState,
  OrderSide,
  RankingsSnapshot,
} from '../types/market'

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase 연결 정보가 설정되지 않았습니다.')
  }

  return supabase
}

const errorTranslations: Array<[string, string]> = [
  ['Authentication is required', '로그인이 필요합니다.'],
  ['Join the league before placing an order', '먼저 리그에 참가해 주세요.'],
  ['League is not open for participation', '현재 참가할 수 있는 리그가 아닙니다.'],
  ['This account is banned from Randoland participation', '운영 정책 위반으로 이후 리그 참가가 제한된 계정입니다.'],
  ['The stock is not available for trading', '현재 거래할 수 없는 종목입니다.'],
  ['cannot trade their own listed stock', '본인이 상장한 종목은 매매할 수 없습니다.'],
  ['Orders are not being accepted', '현재 주문 접수 시간이 아닙니다.'],
  ['Up to five orders per side', '매수와 매도 주문은 라운드당 각각 5건까지 가능합니다.'],
  ['Available RP is insufficient', '주문 가능한 RP가 부족합니다.'],
  ['Available shares are insufficient', '주문 가능한 보유 수량이 부족합니다.'],
  ['Only a pending order can be cancelled', '체결 전 대기 주문만 취소할 수 있습니다.'],
  ['duplicate key value violates unique constraint "randoland_stocks_one_listing', '이미 상장한 종목이 있습니다.'],
  ['duplicate key value violates unique constraint "randoland_stocks_league_id_ticker', '이미 사용 중인 티커입니다.'],
  ['An attendance token is required', '홀짝 사다리에 사용할 출석 토큰이 없습니다.'],
  ['An active league participant is required', '진행 중인 리그 참가자만 이용할 수 있습니다.'],
  ['Ticker must contain', '티커는 영문 대문자와 숫자 2~8자로 입력해 주세요.'],
  ['Description must contain', '종목 설명은 10~1,000자로 입력해 주세요.'],
  ['Each weekly story must contain', '각 주차 이야기는 5~2,000자로 입력해 주세요.'],
]

export function readableSupabaseError(error: PostgrestError | Error | string): string {
  const raw = typeof error === 'string' ? error : error.message
  const translated = errorTranslations.find(([needle]) => raw.includes(needle))
  return translated?.[1] ?? raw
}

function throwIfError(error: PostgrestError | null) {
  if (error) throw new Error(readableSupabaseError(error))
}

export async function loadMarketSnapshot(leagueId?: string | null): Promise<MarketSnapshot> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_get_market_snapshot', {
    p_league_id: leagueId ?? null,
  })
  throwIfError(error)

  const snapshot = data as unknown as MarketSnapshot
  return {
    ...snapshot,
    stocks: (snapshot.stocks ?? []).map((stock) => ({
      ...stock,
      owner: stock.listedBy ?? stock.owner ?? (stock.isBaseStock ? '기본 상장' : '상장자 비공개'),
      candles: (stock.candles ?? []).map((candle) => ({
        ...candle,
        time: candle.time.slice(0, 10),
      })),
    })),
    news: snapshot.news ?? [],
  }
}

export async function loadMyState(leagueId: string): Promise<MyState> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_get_my_state', {
    p_league_id: leagueId,
  })
  throwIfError(error)
  return data as unknown as MyState
}

export async function loadRankings(leagueId: string): Promise<RankingsSnapshot> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_get_rankings', {
    p_league_id: leagueId,
  })
  throwIfError(error)

  const snapshot = data as unknown as RankingsSnapshot
  return {
    ...snapshot,
    isFinal: snapshot.isFinal ?? false,
    rankings: snapshot.rankings ?? [],
    awards: snapshot.awards ?? [],
  }
}

export async function joinLeague(leagueId: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_join_league', {
    p_league_id: leagueId,
  })
  throwIfError(error)
  return data
}

export async function placeOrder(
  leagueId: string,
  stockId: string,
  side: OrderSide,
  quantity: number,
  leveragePercent: number,
) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_place_order', {
    p_league_id: leagueId,
    p_stock_id: stockId,
    p_side: side,
    p_quantity: quantity,
    p_leverage_percent: leveragePercent,
  })
  throwIfError(error)
  return data
}

export async function cancelOrder(orderId: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_cancel_order', {
    p_order_id: orderId,
  })
  throwIfError(error)
  return data
}

export async function submitListing(leagueId: string, submission: ListingSubmission) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_submit_listing', {
    p_league_id: leagueId,
    p_ticker: submission.ticker,
    p_name: submission.name,
    p_initial_price: submission.initialPrice,
    p_description: submission.description,
    p_theme: submission.theme,
    p_weekly_stories: submission.weeklyStories,
  })
  throwIfError(error)
  return data
}

export async function claimAttendance(leagueId: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_claim_attendance', {
    p_league_id: leagueId,
  })
  throwIfError(error)
  return data as unknown as { date: string; awarded: boolean; tokens: number }
}

export async function playLadder(leagueId: string, choice: 'odd' | 'even') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_play_ladder', {
    p_league_id: leagueId,
    p_choice: choice,
  })
  throwIfError(error)
  return data as unknown as LadderResult
}
