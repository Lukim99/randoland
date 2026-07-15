import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { supabase } from '../lib/supabase'
import {
  cancelOrder as cancelOrderRequest,
  chooseLadderAction as chooseLadderActionRequest,
  claimAttendance as claimAttendanceRequest,
  getOrderCapacity as getOrderCapacityRequest,
  joinLeague,
  loadMarketSnapshot,
  loadMyState,
  loadRankings,
  placeOrder as placeOrderRequest,
  playLadder as playLadderRequest,
  playLadderSecond as playLadderSecondRequest,
  setStockLogo as setStockLogoRequest,
  submitListing as submitListingRequest,
  uploadProfileImage as uploadProfileImageRequest,
} from '../services/market'
import type { LadderChoice, ListingSubmission, MarketSnapshot, MyState, OrderSide, RankingsSnapshot } from '../types/market'
import { MarketContext, type MarketContextValue } from './market-context'

const realtimeTables = [
  'randoland_leagues',
  'randoland_rounds',
  'randoland_stocks',
  'randoland_price_candles',
  'randoland_news',
  'randoland_participants',
  'randoland_orders',
  'randoland_positions',
  'randoland_asset_ledger',
  'randoland_trade_cycles',
  'randoland_attendance',
  'randoland_ladder_games',
  'randoland_rank_snapshots',
  'randoland_league_awards',
] as const

function createClientRequestId() {
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

export function MarketProvider({ children }: PropsWithChildren) {
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [myState, setMyState] = useState<MyState | null>(null)
  const [rankings, setRankings] = useState<RankingsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)
  const pendingOrderRequest = useRef<{ signature: string; key: string } | null>(null)
  const pendingLadderRequest = useRef<{ signature: string; key: string } | null>(null)

  const refreshData = useCallback(async (quiet: boolean) => {
    const requestId = ++requestSequence.current
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const nextMarket = await loadMarketSnapshot()
      let nextMyState: MyState | null = null
      let nextRankings: RankingsSnapshot | null = null

      if (nextMarket.league) {
        ;[nextMyState, nextRankings] = await Promise.all([
          loadMyState(nextMarket.league.id),
          loadRankings(nextMarket.league.id),
        ])
      }

      if (requestSequence.current !== requestId) return
      setMarket(nextMarket)
      setMyState(nextMyState)
      setRankings(nextRankings)
    } catch (refreshError) {
      if (requestSequence.current !== requestId) return
      setError(refreshError instanceof Error ? refreshError.message : '시장 정보를 불러오지 못했습니다.')
    } finally {
      if (requestSequence.current === requestId) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  const refresh = useCallback(() => refreshData(true), [refreshData])

  useEffect(() => {
    void refreshData(false)
  }, [refreshData])

  useEffect(() => {
    const leagueId = market?.league?.id
    const client = supabase
    if (!client || !leagueId) return

    let refreshTimer: number | undefined
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => void refreshData(true), 180)
    }

    const channel = client.channel(`randoland-live-${leagueId}`)
    realtimeTables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh,
      )
    })
    channel.subscribe()

    return () => {
      window.clearTimeout(refreshTimer)
      void client.removeChannel(channel)
    }
  }, [market?.league?.id, refreshData])

  const requireLeagueId = useCallback(() => {
    const leagueId = market?.league?.id
    if (!leagueId) throw new Error('현재 참가 가능한 리그가 없습니다.')
    return leagueId
  }, [market?.league?.id])

  const joinCurrentLeague = useCallback(async (nickname: string) => {
    await joinLeague(requireLeagueId(), nickname)
    await refreshData(true)
  }, [refreshData, requireLeagueId])

  const getOrderCapacity = useCallback((
    stockId: string,
    side: OrderSide,
    leveragePercent: number,
  ) => getOrderCapacityRequest(requireLeagueId(), stockId, side, leveragePercent), [requireLeagueId])

  const placeOrder = useCallback(async (
    stockId: string,
    side: OrderSide,
    quantity: number,
    leveragePercent: number,
  ) => {
    const leagueId = requireLeagueId()
    const signature = JSON.stringify([leagueId, stockId, side, quantity, leveragePercent])
    let pendingRequest = pendingOrderRequest.current
    if (!pendingRequest || pendingRequest.signature !== signature) {
      pendingRequest = { signature, key: createClientRequestId() }
      pendingOrderRequest.current = pendingRequest
    }

    await placeOrderRequest(
      leagueId,
      stockId,
      side,
      quantity,
      leveragePercent,
      pendingRequest.key,
    )
    if (pendingOrderRequest.current?.key === pendingRequest.key) {
      pendingOrderRequest.current = null
    }
    await refreshData(true)
  }, [refreshData, requireLeagueId])

  const cancelOrder = useCallback(async (orderId: string) => {
    await cancelOrderRequest(orderId)
    await refreshData(true)
  }, [refreshData])

  const submitListing = useCallback(async (submission: ListingSubmission) => {
    await submitListingRequest(requireLeagueId(), submission)
    await refreshData(true)
  }, [refreshData, requireLeagueId])

  const uploadProfileImage = useCallback(async (file: File) => {
    const participant = myState?.participant
    if (!participant) throw new Error('리그 참가 후 프로필 이미지를 변경할 수 있습니다.')
    await uploadProfileImageRequest(participant.id, participant.profileImagePath, file)
    await refreshData(true)
  }, [myState?.participant, refreshData])

  const setStockLogo = useCallback(async (stockId: string, logoSpriteIndex: number) => {
    await setStockLogoRequest(stockId, logoSpriteIndex)
    await refreshData(true)
  }, [refreshData])

  const claimAttendance = useCallback(async () => {
    const result = await claimAttendanceRequest(requireLeagueId())
    await refreshData(true)
    return result
  }, [refreshData, requireLeagueId])

  const playLadder = useCallback(async (choice: LadderChoice) => {
    const leagueId = requireLeagueId()
    const signature = `${leagueId}:${choice}`
    let pendingRequest = pendingLadderRequest.current
    if (!pendingRequest || pendingRequest.signature !== signature) {
      pendingRequest = { signature, key: createClientRequestId() }
      pendingLadderRequest.current = pendingRequest
    }

    const result = await playLadderRequest(leagueId, choice, pendingRequest.key)
    if (pendingLadderRequest.current?.key === pendingRequest.key) {
      pendingLadderRequest.current = null
    }
    await refreshData(true)
    return result
  }, [refreshData, requireLeagueId])

  const chooseLadderAction = useCallback(async (gameId: string, action: 'go' | 'stop') => {
    const result = await chooseLadderActionRequest(gameId, action)
    await refreshData(true)
    return result
  }, [refreshData])

  const playLadderSecond = useCallback(async (gameId: string, choice: LadderChoice) => {
    const result = await playLadderSecondRequest(gameId, choice)
    await refreshData(true)
    return result
  }, [refreshData])

  const value = useMemo<MarketContextValue>(
    () => ({
      market,
      myState,
      rankings,
      loading,
      refreshing,
      error,
      refresh,
      joinCurrentLeague,
      getOrderCapacity,
      placeOrder,
      cancelOrder,
      submitListing,
      uploadProfileImage,
      setStockLogo,
      claimAttendance,
      playLadder,
      chooseLadderAction,
      playLadderSecond,
    }),
    [
      cancelOrder,
      claimAttendance,
      error,
      getOrderCapacity,
      joinCurrentLeague,
      loading,
      market,
      myState,
      placeOrder,
      playLadder,
      chooseLadderAction,
      playLadderSecond,
      rankings,
      refresh,
      refreshing,
      uploadProfileImage,
      setStockLogo,
      submitListing,
    ],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}
