import { ArrowRight, BarChart3, Clock3, MessageCircle, Newspaper, ShieldCheck } from 'lucide-react'
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
          <span className="login-round-chip"><span className="status-dot" /> 24시간 거래소</span>
        </div>
        <div className="login-visual__content">
          <span className="eyebrow">WELCOME</span>
          <h1>
            란도랜드2에 오신 것을
            <br />환영합니다.
          </h1>
          <p>
            나만의 종목을 상장하고, 매일 공개되는 AI 뉴스와 가격 흐름 속에서
            100만 RP를 운용하세요.
          </p>
          <div className="login-feature-grid">
            <div><BarChart3 size={20} /><span><strong>일일 캔들</strong><small>매일 09:00 갱신</small></span></div>
            <div><Newspaper size={20} /><span><strong>AI 뉴스</strong><small>스토리 기반 생성</small></span></div>
            <div><Clock3 size={20} /><span><strong>일괄 체결</strong><small>변동 전 가격 적용</small></span></div>
            <div><ShieldCheck size={20} /><span><strong>1인 1참가</strong><small>카카오 계정 인증</small></span></div>
          </div>
        </div>
        <div className="login-tape" aria-hidden="true">
          <span>정산 <b>09:00 KST</b></span>
          <span>초기 자산 <b>1,000,000 RP</b></span>
          <span>레버리지 <b>최대 50%</b></span>
          <span>라운드 <b>1일</b></span>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-card">
          <div className="mobile-login-brand"><Brand /></div>
          <span className="eyebrow">카카오 로그인</span>
          <h2>리그에 입장하기</h2>
          <p>카카오 계정으로 본인 확인 후 익명 닉네임이 생성됩니다.</p>
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
            <span><strong>계정 정보는 안전하게 분리됩니다.</strong> 거래 화면에는 익명 닉네임만 공개됩니다.</span>
          </div>
        </div>
      </section>
    </main>
  )
}
