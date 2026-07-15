import {
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Gift,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  Trophy,
  WalletCards,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useMarket } from '../market/useMarket'
import { Brand } from './Brand'
import { ProfileImage } from './ProfileImage'
import { ProfileImageUploadDialog } from './ProfileImageUploadDialog'

const navigation = [
  { to: '/', label: '거래소', icon: LayoutDashboard, end: true },
  { to: '/news', label: '뉴스', icon: Newspaper },
  { to: '/portfolio', label: '내 자산', icon: WalletCards },
  { to: '/orders', label: '주문 내역', icon: ClipboardList },
  { to: '/listing', label: '종목 상장', icon: Building2 },
  { to: '/discussion', label: '종목토론방', icon: MessageSquareText },
  { to: '/ranking', label: '주간 순위', icon: Trophy },
  { to: '/rewards', label: '리워드', icon: Gift },
]
const adminNavigation = { to: '/admin', label: '리그 관리', icon: ShieldCheck, end: false }

export function AppShell() {
  const { signOut, isAdmin, adminRole } = useAuth()
  const { market, myState, refreshing, refresh, uploadProfileImage } = useMarket()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [profileUploadOpen, setProfileUploadOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const visibleNavigation = isAdmin ? [...navigation, adminNavigation] : navigation
  const mobilePrimaryNavigation = visibleNavigation.filter(({ to }) => ['/', '/news', '/portfolio', '/discussion'].includes(to))
  const mobileMoreNavigation = visibleNavigation.filter(({ to }) => ['/orders', '/listing', '/ranking', '/rewards', '/admin'].includes(to))
  const nickname = myState?.participant?.nickname ?? '리그 참가 전'
  const profileImageUrl = myState?.participant?.profileImageUrl
  const marketStatus = market?.league?.status === 'active'
    ? '거래소 운영 중'
    : market?.league?.status === 'registration'
      ? '리그 참가 접수 중'
      : market?.league?.status === 'finished'
        ? '리그 종료'
        : '리그 준비 중'
  const moreActive = mobileMoreNavigation.some(({ to }) => location.pathname === to || location.pathname.startsWith(`${to}/`))

  useEffect(() => {
    setMobileMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileMoreOpen) return undefined

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileMoreOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMoreOpen])

  async function handleProfileConfirm(file: File) {
    setProfileSaving(true)
    setProfileError(null)
    try {
      await uploadProfileImage(file)
      setProfileUploadOpen(false)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : '프로필 이미지 변경에 실패했습니다.')
    } finally {
      setProfileSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        본문으로 바로가기
      </a>

      <aside className="desktop-sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="주요 메뉴">
          {visibleNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <Icon aria-hidden="true" size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="user-card" type="button" onClick={() => void signOut()} title="로그아웃">
            <ProfileImage src={profileImageUrl} size="md" className="user-avatar" />
            <span className="user-card__copy">
              <strong>{nickname}</strong>
              <small>로그아웃</small>
            </span>
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="mobile-brand">
            <Brand compact />
          </div>
          <div className="topbar__market">
            <span className="status-dot" />
            <span>{marketStatus}</span>
          </div>
          <div className="topbar__actions">
            <button
              className={`icon-button notification-button${refreshing ? ' is-spinning' : ''}`}
              type="button"
              aria-label="시장 정보 새로고침"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              <RefreshCw size={18} />
            </button>
            <button className="profile-trigger" type="button" onClick={() => setMenuOpen((open) => !open)}>
              <ProfileImage src={profileImageUrl} size="sm" className="profile-trigger__avatar" />
              <span>{nickname}</span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            <button
              className="mobile-menu-trigger icon-button"
              type="button"
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          {menuOpen && (
            <div className="account-menu">
              <div className="account-menu__identity">
                <ProfileImage src={profileImageUrl} size="lg" />
                <span>
                  <strong>{nickname}</strong>
                  <small>
                    {isAdmin
                      ? `리그 관리자 · ${adminRole === 'owner' ? '소유자' : '운영자'}`
                      : myState?.joined
                        ? '리그 참가 중'
                        : '카카오 로그인 완료'}
                  </small>
                </span>
              </div>
              {myState?.joined && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileError(null)
                    setProfileUploadOpen(true)
                    setMenuOpen(false)
                  }}
                >
                  <ImageIcon size={16} /> 프로필 이미지 변경
                </button>
              )}
              <button type="button" onClick={() => void signOut()}>
                <LogOut size={16} /> 로그아웃
              </button>
            </div>
          )}
        </header>

        <main id="main-content" className="page-content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="모바일 주요 메뉴">
        {mobilePrimaryNavigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
            <Icon aria-hidden="true" size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          className={moreActive || mobileMoreOpen ? 'is-active' : undefined}
          type="button"
          aria-expanded={mobileMoreOpen}
          aria-controls="mobile-more-menu"
          onClick={() => {
            setMenuOpen(false)
            setMobileMoreOpen((open) => !open)
          }}
        >
          <MoreHorizontal aria-hidden="true" size={20} />
          <span>더보기</span>
        </button>
      </nav>

      {mobileMoreOpen && (
        <div
          className="mobile-more-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMobileMoreOpen(false)
          }}
        >
          <section id="mobile-more-menu" className="mobile-more-menu" role="dialog" aria-modal="true" aria-label="더보기 메뉴">
            <header><span className="eyebrow">란도랜드2</span><h2>더보기</h2></header>
            <nav aria-label="추가 메뉴">
              {mobileMoreNavigation.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                  <Icon aria-hidden="true" size={19} />
                  <span>{label}</span>
                  <ChevronRight aria-hidden="true" className="mobile-more-menu__arrow" size={15} />
                </NavLink>
              ))}
            </nav>
          </section>
        </div>
      )}

      {profileUploadOpen && (
        <ProfileImageUploadDialog
          currentImageUrl={profileImageUrl}
          busy={profileSaving}
          error={profileError}
          onClose={() => setProfileUploadOpen(false)}
          onConfirm={(file) => void handleProfileConfirm(file)}
        />
      )}
    </div>
  )
}
