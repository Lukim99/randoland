import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Gift,
  LockKeyhole,
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
  description: string
  icon: ComponentType<{ size?: number }>
  rules: string[]
}

const content: Record<FeatureKind, FeatureContent> = {
  portfolio: {
    eyebrow: '내 투자 현황', title: '내 자산', icon: WalletCards,
    description: '보유 RP, 종목별 평가금액, 레버리지와 완료 매매 사이클을 실시간으로 확인합니다.',
    rules: ['초기 자금 1,000,000 RP', '09:00 체결 직후 평가자산 갱신', '보유 기간은 라운드 단위 집계'],
  },
  orders: {
    eyebrow: '주문 관리', title: '주문 내역', icon: ClipboardList,
    description: '접수된 매수·매도 주문과 체결 결과, 취소 기록을 라운드별로 확인합니다.',
    rules: ['체결 전 대기 주문 자유 취소', '매수·매도 각각 라운드당 최대 5건', '09:00 변동 전 가격으로 일괄 체결'],
  },
  listing: {
    eyebrow: '나만의 종목', title: '종목 상장', icon: Building2,
    description: '상장명과 테마, 한 달의 주차별 이야기를 제출해 나만의 종목을 시장에 상장합니다.',
    rules: ['참가자당 최대 1개 종목', '본인 상장 종목 매매 불가', '주차별 이야기는 AI 뉴스 생성에 활용'],
  },
  ranking: {
    eyebrow: '일주일마다 공개', title: '주간 순위', icon: Trophy,
    description: '시장 중간의 과도한 눈치 싸움을 막기 위해 순위는 일주일에 한 번만 공개합니다.',
    rules: ['매주 일요일 09:00 KST 공개', '주간 스냅샷으로 영구 기록', '다음 공개 전까지 현재 순위 비공개'],
  },
  rewards: {
    eyebrow: '리그 보상', title: '리워드', icon: Gift,
    description: '출석 토큰과 홀짝 사다리, 레버리지 기능으로 라운드마다 새로운 선택지를 활용합니다.',
    rules: ['레버리지 최대 50%', '레버리지 사용분의 매도 평가액에서 5% 차감', '게임 결과는 보유자산에 즉시 반영'],
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
        <p>{page.description}</p>
      </header>
      <div className="feature-layout feature-layout--live">
        <div className="feature-live-content"><ActiveView /></div>
        <aside className="panel feature-rules-card">
          <div className="section-heading section-heading--compact"><div><span className="eyebrow">핵심 규칙</span><h2>적용 기준</h2></div><LockKeyhole size={19} /></div>
          <ul>
            {page.rules.map((rule) => <li key={rule}><CheckCircle2 size={17} /><span>{rule}</span></li>)}
          </ul>
        </aside>
      </div>
    </div>
  )
}
