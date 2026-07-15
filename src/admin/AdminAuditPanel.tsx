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
  user_ban_revoked: '이후 참가 제한 해제',
  global_event_upserted: '글로벌 이벤트 저장',
  stock_listed: '관리자 종목 상장',
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
