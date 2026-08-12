import { Building2, Clock3, ShieldCheck } from 'lucide-react'
import { StockLogo } from '../components/StockLogo'
import { formatPrice } from '../lib/format'
import { useMarket } from '../market/useMarket'
import { ParticipantGate } from './ParticipantGate'

const listingStatusLabel: Record<string, string> = {
  pending: '관리자 설정 중',
  active: '거래 중',
  halted: '거래 정지',
  delisted: '상장 종료',
  rejected: '등록 취소',
}

export function ListingView() {
  const { market, myState } = useMarket()
  const listing = myState?.listing
  const listingStock = listing ? market?.stocks.find((stock) => stock.id === listing.id) : null

  return (
    <ParticipantGate>
      <div className="feature-stack">
        {listing ? (
          <section className="panel listed-stock-card">
            {listingStock ? (
              <StockLogo
                src={listingStock.logoImageUrl}
                spriteIndex={listingStock.logoSpriteIndex}
                size="xl"
                className="listed-stock-card__mark"
                label={`${listing.name} 종목 이미지`}
              />
            ) : (
              <span className="listed-stock-card__mark listed-stock-card__placeholder" aria-hidden="true">
                <Building2 size={28} />
              </span>
            )}
            <div>
              <span className="eyebrow">{listing.ticker}</span>
              <h2>{listing.name}</h2>
              <p>{listing.description}</p>
              <small className="listed-stock-card__immutable-note">
                종목명·상장가·로고는 상장 확정 후 변경할 수 없습니다.
              </small>
            </div>
            <dl>
              <div><dt>상태</dt><dd>{listingStatusLabel[listing.status] ?? listing.status}</dd></div>
              <div><dt>현재가</dt><dd>{formatPrice(listing.currentPrice)} RP</dd></div>
              <div><dt>상장가</dt><dd>{formatPrice(listing.initialPrice)} RP</dd></div>
              <div><dt>테마</dt><dd>{listing.theme || '미지정'}</dd></div>
            </dl>
          </section>
        ) : (
          <section className="panel listing-managed-state">
            <span className="listing-managed-state__icon"><ShieldCheck size={28} /></span>
            <div>
              <span className="eyebrow">관리자 상장</span>
              <h2>종목 상장은 관리자가 진행합니다</h2>
              <p>
                참가자가 전달한 종목 설명과 라운드별 등락·기사 계획을 관리자가 확인한 뒤 등록합니다.
                등록이 완료되면 이 화면에서 내 종목을 확인할 수 있습니다.
              </p>
            </div>
            <span className="listing-managed-state__note"><Clock3 size={15} /> 리그 진행 중에도 다음 라운드 상장을 예약할 수 있습니다.</span>
          </section>
        )}

        <p className="feature-footnote">
          참가자당 한 종목만 배정되며 본인 종목은 주문할 수 없습니다.
        </p>
      </div>
    </ParticipantGate>
  )
}
