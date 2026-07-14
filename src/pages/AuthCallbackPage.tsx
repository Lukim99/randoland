import { AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Brand } from '../components/Brand'

export function AuthCallbackPage() {
  const { session, loading, error } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true })
  }, [loading, navigate, session])

  if (error) {
    return (
      <main className="auth-callback-page">
        <Brand />
        <AlertTriangle size={28} />
        <h1>로그인을 완료하지 못했습니다</h1>
        <p>{error}</p>
        <button type="button" onClick={() => navigate('/login', { replace: true })}>로그인으로 돌아가기</button>
      </main>
    )
  }

  return (
    <main className="auth-callback-page" aria-live="polite">
      <Brand />
      <span className="brand-loader" aria-hidden="true" />
      <h1>카카오 계정을 확인하고 있습니다</h1>
      <p>인증이 완료되면 거래소로 자동 이동합니다.</p>
    </main>
  )
}
