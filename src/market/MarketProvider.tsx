import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { supabase } from '../lib/supabase'
import {
  cancelOrder as cancelOrderRequest,
  claimAttendance as claimAttendanceRequest,
  joinLeague,
  loadMarketSnapshot,
  loadMyState,
  loadRankings,
  placeOrder as placeOrderRequest,
  playLadder as playLadderRequest,
  setProfileSprite as setProfileSpriteRequest,
  setStockLogo as setStockLogoRequest,
  submitListing as submitListingRequest,
} from '../services/market'
import type { ListingSubmission, MarketSnapshot, MyState, OrderSide, RankingsSnapshot } from '../types/market'
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

export function MarketProvider({ children }: PropsWithChildren) {
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [myState, setMyState] = useState<MyState | null>(null)
  const [rankings, setRankings] = useState<RankingsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)

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

  const joinCurrentLeague = useCallback(async () => {
    await joinLeague(requireLeagueId())
    await refreshData(true)
  }, [refreshData, requireLeagueId])

  const placeOrder = useCallback(async (
    stockId: string,
    side: OrderSide,
    quantity: number,
    leveragePercent: number,
  ) => {
    await placeOrderRequest(requireLeagueId(), stockId, side, quantity, leveragePercent)
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

  const setProfileSprite = useCallback(async (profileSpriteIndex: number) => {
    await setProfileSpriteRequest(requireLeagueId(), profileSpriteIndex)
    await refreshData(true)
  }, [refreshData, requireLeagueId])

  const setStockLogo = useCallback(async (stockId: string, logoSpriteIndex: number) => {
    await setStockLogoRequest(stockId, logoSpriteIndex)
    await refreshData(true)
  }, [refreshData])

  const claimAttendance = useCallback(async () => {
    const result = await claimAttendanceRequest(requireLeagueId())
    await refreshData(true)
    return result
  }, [refreshData, requireLeagueId])

  const playLadder = useCallback(async (choice: 'odd' | 'even') => {
    const result = await playLadderRequest(requireLeagueId(), choice)
    await refreshData(true)
    return result
  }, [refreshData, requireLeagueId])

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
      placeOrder,
      cancelOrder,
      submitListing,
      setProfileSprite,
      setStockLogo,
      claimAttendance,
      playLadder,
    }),
    [
      cancelOrder,
      claimAttendance,
      error,
      joinCurrentLeague,
      loading,
      market,
      myState,
      placeOrder,
      playLadder,
      rankings,
      refresh,
      refreshing,
      setProfileSprite,
      setStockLogo,
      submitListing,
    ],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}
