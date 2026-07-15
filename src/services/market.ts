import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type {
  LadderChoice,
  LadderResult,
  ListingSubmission,
  MarketSnapshot,
  MyState,
  OrderCapacity,
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
  ['A participant cannot trade their own listed stock', '본인이 상장한 종목은 매매할 수 없습니다.'],
  ['cannot trade their own listed stock', '본인이 상장한 종목은 매매할 수 없습니다.'],
  ['Orders are not being accepted', '현재 주문 접수 시간이 아닙니다.'],
  ['Up to five orders per side', '매수와 매도 주문은 라운드당 각각 5건까지 가능합니다.'],
  ['Order quantity must be a positive whole number', '주문 수량은 1주 이상의 정수로 입력해 주세요.'],
  ['Leverage must be between 0 and 50 percent', '레버리지는 0%부터 50%까지 설정할 수 있습니다.'],
  ['Leverage is only available for buy orders', '레버리지는 일반 매수 주문에만 사용할 수 있습니다.'],
  ['Available RP is insufficient', '주문 가능한 RP가 부족합니다.'],
  ['Available shares are insufficient', '주문 가능한 보유 수량이 부족합니다.'],
  ['Short exposure limit exceeded', '공매도 가능 한도를 초과했습니다.'],
  ['The requested quantity exceeds the current order capacity', '현재 주문 가능한 수량을 초과했습니다.'],
  ['A client request ID is required', '주문 요청을 식별하지 못했습니다. 다시 시도해 주세요.'],
  ['Client request ID was already used with different order terms', '같은 주문 요청의 내용이 달라졌습니다. 다시 입력해 주세요.'],
  ['Available short position is insufficient', '청산 가능한 공매도 수량이 부족합니다.'],
  ['New buy and short orders are blocked until receivable RP is repaid', '미수 RP를 상환하기 전에는 신규 매수와 공매도를 할 수 없습니다.'],
  ['Receivable RP must be repaid', '미수 RP를 상환하기 전에는 신규 매수와 공매도를 할 수 없습니다.'],
  ['A long and short position cannot coexist', '같은 종목의 일반 보유와 공매도 포지션을 동시에 보유할 수 없습니다.'],
  ['A long and short position cannot be held in the same stock', '같은 종목의 일반 보유와 공매도 포지션을 동시에 보유할 수 없습니다.'],
  ['The requested cover quantity exceeds the short position', '청산 가능한 공매도 수량을 초과했습니다.'],
  ['Only a pending order can be cancelled', '체결 전 대기 주문만 취소할 수 있습니다.'],
  ['Nickname must be', '닉네임은 한글 8자 이하 또는 영문·숫자 16자 이하로 입력해 주세요.'],
  ['This nickname is already in use', '이미 사용 중인 닉네임입니다.'],
  ['Nickname is already in use', '이미 사용 중인 닉네임입니다.'],
  ['Complete the active Go or Stop game first', '진행 중인 Go or Stop 게임을 먼저 완료해 주세요.'],
  ['An idempotency key is required', '게임 요청을 식별하지 못했습니다. 다시 시도해 주세요.'],
  ['Idempotency key was already used with a different choice', '같은 게임 요청의 선택이 달라졌습니다. 기존 선택으로 다시 시도해 주세요.'],
  ['This game is not waiting for a Go or Stop decision', '이미 처리된 Go or Stop 선택입니다.'],
  ['This game is not waiting for the second pick', '이미 처리된 두 번째 홀짝 선택입니다.'],
  ['duplicate key value violates unique constraint "randoland_stocks_one_listing', '이미 상장한 종목이 있습니다.'],
  ['duplicate key value violates unique constraint "randoland_stocks_league_id_ticker', '이미 사용 중인 티커입니다.'],
  ['An attendance token is required', '홀짝 사다리에 사용할 출석 토큰이 없습니다.'],
  ['An active league participant is required', '진행 중인 리그 참가자만 이용할 수 있습니다.'],
  ['Ticker must contain', '티커는 영문 대문자와 숫자 2~8자로 입력해 주세요.'],
  ['Description must contain', '종목 설명은 10~1,000자로 입력해 주세요.'],
  ['Each weekly story must contain', '각 주차 이야기는 5~2,000자로 입력해 주세요.'],
  ['Profile sprite index must be between', '프로필 이미지를 다시 선택해 주세요.'],
  ['Stock logo sprite index must be between', '종목 이미지를 다시 선택해 주세요.'],
  ['Only the listing owner can select its stock logo', '본인이 상장한 종목 이미지만 변경할 수 있습니다.'],
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
  const stockIds = (snapshot.stocks ?? []).map((stock) => stock.id)
  const spriteIndexByStockId = new Map<string, number>()

  if (stockIds.length > 0) {
    const { data: spriteRows, error: spriteError } = await client
      .from('randoland_stocks')
      .select('id, logo_sprite_index')
      .in('id', stockIds)
    throwIfError(spriteError)

    spriteRows?.forEach((row) => {
      spriteIndexByStockId.set(row.id, row.logo_sprite_index)
    })
  }

  return {
    ...snapshot,
    stocks: (snapshot.stocks ?? []).map((stock) => ({
      ...stock,
      logoSpriteIndex: spriteIndexByStockId.get(stock.id) ?? 0,
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

  const rawState = data as unknown as MyState
  const normalizedOrders = (rawState.orders ?? []).map((order) => ({
    ...order,
    orderType: order.orderType ?? order.side,
    requestedQuantity: order.requestedQuantity
      ?? order.executedQuantity
      ?? order.quantity
      ?? (order.cashAmount && (order.orderPrice || order.executionPrice)
        ? order.cashAmount / (order.orderPrice || order.executionPrice || 1)
        : 0),
    orderPrice: order.orderPrice ?? order.executionPrice ?? 0,
  }))
  const state: MyState = {
    ...rawState,
    positions: rawState.positions ?? [],
    shortPositions: rawState.shortPositions ?? [],
    orders: normalizedOrders,
    executedOrderCount: rawState.executedOrderCount
      ?? normalizedOrders.filter((order) => order.status === 'executed').length,
    orderQuota: rawState.orderQuota ?? {
      buySubmitted: 0,
      sellSubmitted: 0,
      buyRemaining: 5,
      sellRemaining: 5,
      buyExecuted: 0,
      sellExecuted: 0,
      limit: 5,
    },
    ledger: (rawState.ledger ?? []).map((entry) => ({
      ...entry,
      receivableAfter: entry.receivableAfter ?? 0,
    })),
    tradeCycles: (rawState.tradeCycles ?? []).map((cycle) => ({
      ...cycle,
      positionType: cycle.positionType ?? 'long',
    })),
    ladderGames: rawState.ladderGames ?? [],
    activeLadderGame: rawState.activeLadderGame ?? null,
  }
  if (!state.participant) return state

  const { data: participantSprite, error: spriteError } = await client
    .from('randoland_participants')
    .select('profile_sprite_index')
    .eq('id', state.participant.id)
    .maybeSingle()
  throwIfError(spriteError)

  return {
    ...state,
    participant: {
      ...state.participant,
      profileSpriteIndex: participantSprite?.profile_sprite_index ?? 0,
      receivableRp: state.participant.receivableRp ?? 0,
      longMarketValue: state.participant.longMarketValue ?? state.participant.portfolioGrossValue ?? 0,
      longCostBasis: state.participant.longCostBasis ?? 0,
      shortExposure: state.participant.shortExposure ?? 0,
      shortUnrealizedProfit: state.participant.shortUnrealizedProfit ?? 0,
      totalUnrealizedProfit: state.participant.totalUnrealizedProfit ?? 0,
      totalUnrealizedReturn: state.participant.totalUnrealizedReturn ?? 0,
      leveragePrincipal: state.participant.leveragePrincipal ?? 0,
      projectedLeverageFee: state.participant.projectedLeverageFee ?? 0,
    },
  }
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

export async function joinLeague(leagueId: string, nickname: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_join_league', {
    p_league_id: leagueId,
    p_nickname: nickname,
  })
  throwIfError(error)
  return data
}

export async function getOrderCapacity(
  leagueId: string,
  stockId: string,
  side: OrderSide,
  leveragePercent: number,
) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_get_order_capacity', {
    p_league_id: leagueId,
    p_stock_id: stockId,
    p_side: side,
    p_leverage_percent: leveragePercent,
  })
  throwIfError(error)
  return data as unknown as OrderCapacity
}

export async function placeOrder(
  leagueId: string,
  stockId: string,
  side: OrderSide,
  quantity: number,
  leveragePercent: number,
  clientRequestId: string,
) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_place_order', {
    p_league_id: leagueId,
    p_stock_id: stockId,
    p_side: side,
    p_quantity: quantity,
    p_leverage_percent: leveragePercent,
    p_client_request_id: clientRequestId,
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
  const { data, error } = await client.rpc('randoland_submit_listing_with_logo', {
    p_league_id: leagueId,
    p_logo_sprite_index: submission.logoSpriteIndex,
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

export async function setProfileSprite(leagueId: string, profileSpriteIndex: number) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_set_profile_sprite', {
    p_league_id: leagueId,
    p_profile_sprite_index: profileSpriteIndex,
  })
  throwIfError(error)
  return data
}

export async function setStockLogo(stockId: string, logoSpriteIndex: number) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_set_stock_logo', {
    p_stock_id: stockId,
    p_logo_sprite_index: logoSpriteIndex,
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

export async function playLadder(
  leagueId: string,
  choice: LadderChoice,
  idempotencyKey: string,
) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_play_ladder', {
    p_league_id: leagueId,
    p_choice: choice,
    p_idempotency_key: idempotencyKey,
  })
  throwIfError(error)
  return data as unknown as LadderResult
}

export async function chooseLadderAction(gameId: string, action: 'go' | 'stop') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_choose_ladder_action', {
    p_game_id: gameId,
    p_action: action,
  })
  throwIfError(error)
  return data as unknown as LadderResult
}

export async function playLadderSecond(gameId: string, choice: LadderChoice) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('randoland_play_ladder_second', {
    p_game_id: gameId,
    p_choice: choice,
  })
  throwIfError(error)
  return data as unknown as LadderResult
}
