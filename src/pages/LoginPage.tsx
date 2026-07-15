import { ArrowRight, MessageCircle, ShieldCheck } from 'lucide-react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Brand } from '../components/Brand'
import { isSupabaseConfigured } from '../lib/supabase'

export function LoginPage() {
  const { session, error, signInWithKakao } = useAuth()

  if (session) return <Navigate to="/" replace />

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="란도랜드2 소개">
        <div className="login-visual__top">
          <Brand />
        </div>
        <div className="login-visual__content">
          <h1>
            란도랜드2에 오신 것을
            <br />환영합니다.
          </h1>
          <p>참가자가 만든 이야기가 뉴스와 주가에 반영되는 모의 주식시장 리그입니다.</p>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-card">
          <div className="mobile-login-brand"><Brand /></div>
          <h2>리그에 입장하기</h2>
          <p>로그인 후 리그에서 사용할 닉네임을 설정합니다.</p>
          <button
            className="kakao-login-button"
            type="button"
            onClick={() => void signInWithKakao()}
            disabled={!isSupabaseConfigured}
          >
            <MessageCircle size={20} fill="currentColor" />
            카카오로 계속하기
            <ArrowRight size={18} />
          </button>
          {!isSupabaseConfigured && (
            <p className="auth-error" role="alert">로컬 환경 변수에 Supabase 연결 정보가 필요합니다.</p>
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="login-terms">
            로그인하면 리그 운영 정책과 개인정보 처리 기준에 동의한 것으로 간주합니다.
          </div>
          <div className="login-security-note">
            <ShieldCheck size={17} />
            <span><strong>계정 정보는 안전하게 분리됩니다.</strong> 거래 화면에는 설정한 닉네임만 공개됩니다.</span>
          </div>
        </div>
      </section>
    </main>
  )
}
