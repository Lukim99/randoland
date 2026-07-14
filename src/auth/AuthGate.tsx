import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth'

export function AuthGate() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="app-loading" aria-live="polite">
        <span className="brand-loader" aria-hidden="true" />
        <p>란도랜드2 거래소를 불러오는 중입니다.</p>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
