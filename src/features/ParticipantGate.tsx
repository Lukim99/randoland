import type { PropsWithChildren } from 'react'
import { LeagueJoinCard } from '../components/LeagueJoinCard'
import { useMarket } from '../market/useMarket'

export function ParticipantGate({ children }: PropsWithChildren) {
  const { market, myState } = useMarket()

  if (!market?.league || !myState?.joined || !myState.participant) {
    return <LeagueJoinCard compact />
  }

  return children
}
