import {
  Building2,
  ClipboardList,
  Gift,
  Trophy,
  WalletCards,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { ListingView } from '../features/ListingView'
import { OrdersView } from '../features/OrdersView'
import { PortfolioView } from '../features/PortfolioView'
import { RankingView } from '../features/RankingView'
import { RewardsView } from '../features/RewardsView'

type FeatureKind = 'portfolio' | 'orders' | 'listing' | 'ranking' | 'rewards'

interface FeaturePageProps {
  kind: FeatureKind
}

interface FeatureContent {
  eyebrow: string
  title: string
  icon: ComponentType<{ size?: number }>
}

const content: Record<FeatureKind, FeatureContent> = {
  portfolio: {
    eyebrow: '내 투자 현황', title: '내 자산', icon: WalletCards,
  },
  orders: {
    eyebrow: '주문 관리', title: '주문 내역', icon: ClipboardList,
  },
  listing: {
    eyebrow: '나만의 종목', title: '종목 상장', icon: Building2,
  },
  ranking: {
    eyebrow: '일주일마다 공개', title: '주간 순위', icon: Trophy,
  },
  rewards: {
    eyebrow: '리그 보상', title: '리워드', icon: Gift,
  },
}

const views: Record<FeatureKind, ComponentType> = {
  portfolio: PortfolioView,
  orders: OrdersView,
  listing: ListingView,
  ranking: RankingView,
  rewards: RewardsView,
}

export function FeaturePage({ kind }: FeaturePageProps) {
  const page = content[kind]
  const Icon = page.icon
  const ActiveView = views[kind]

  return (
    <div className="feature-page">
      <header className="feature-header">
        <span className="feature-icon"><Icon size={28} /></span>
        <span className="eyebrow">{page.eyebrow}</span>
        <h1>{page.title}</h1>
      </header>
      <div className="feature-layout feature-layout--live">
        <div className="feature-live-content"><ActiveView /></div>
      </div>
    </div>
  )
}
