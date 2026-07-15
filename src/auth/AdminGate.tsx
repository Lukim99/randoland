import { Outlet } from 'react-router'
import { ShieldX } from 'lucide-react'
import { useAuth } from './useAuth'

export function AdminGate() {
  const { isAdmin, adminLoading } = useAuth()

  if (adminLoading) {
    return (
      <section className="empty-state" aria-live="polite">
        <span className="brand-loader" />
        <p>관리자 권한을 확인하는 중입니다.</p>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="empty-state admin-access-denied">
        <ShieldX size={32} aria-hidden="true" />
        <h1>관리자 권한이 필요합니다</h1>
        <p>등록된 리그 관리자 계정으로 로그인해 주세요.</p>
      </section>
    )
  }

  return <Outlet />
}
