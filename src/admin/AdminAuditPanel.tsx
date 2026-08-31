import { History } from 'lucide-react'
import { formatKstDateTime } from '../lib/format'
import type { AdminAuditEntry } from '../types/admin'

interface AdminAuditPanelProps {
  entries: AdminAuditEntry[]
}

const actionLabels: Record<string, string> = {
  admin_access_granted: '관리자 권한 부여',
  admin_access_revoked: '관리자 권한 해제',
  league_created: '리그 개최',
  league_stopped: '리그 중단',
  participant_disqualified: '사용자 제재',
  participant_nickname_changed: '플레이어 닉네임 변경',
  participant_asset_granted: '플레이어 자산 지급',
  participant_asset_revoked: '플레이어 자산 회수',
  user_ban_revoked: '이후 참가 제한 해제',
  stock_draft_created: '종목 초안 생성',
  stock_details_updated: '종목 정보 수정',
  stock_round_plans_saved: '라운드 계획 저장',
  global_news_round_plans_saved: '글로벌 뉴스 계획 저장',
  stock_activated: '종목 상장 확정',
  stock_activation_scheduled: '종목 상장 예약',
  stock_activated_for_round: '예약 종목 거래 시작',
  stock_delisted: '종목 제거',
}

export function AdminAuditPanel({ entries }: AdminAuditPanelProps) {
  return (
    <section className="admin-audit-panel">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><History size={19} aria-hidden="true" /></span>
        <div><span className="eyebrow">AUDIT LOG</span><h2>최근 운영 기록</h2></div>
      </header>
      {entries.length === 0 ? <p className="admin-empty-copy">아직 운영 기록이 없습니다.</p> : (
        <ol className="admin-audit-list">
          {entries.slice(0, 12).map((entry) => (
            <li key={entry.id}>
              <span className="admin-audit-list__dot" />
              <div><strong>{actionLabels[entry.action] ?? entry.action}</strong><span>{formatKstDateTime(entry.createdAt)}</span></div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
