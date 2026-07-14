import {
  Building2,
  ChevronDown,
  ClipboardList,
  Gift,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Trophy,
  WalletCards,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useMarket } from '../market/useMarket'
import { Brand } from './Brand'
import { SpriteIcon } from './SpriteIcon'
import { SpritePickerDialog } from './SpritePickerDialog'

const navigation = [
  { to: '/', label: '거래소', icon: LayoutDashboard, end: true },
  { to: '/portfolio', label: '내 자산', icon: WalletCards },
  { to: '/orders', label: '주문 내역', icon: ClipboardList },
  { to: '/listing', label: '종목 상장', icon: Building2 },
  { to: '/ranking', label: '주간 순위', icon: Trophy },
  { to: '/rewards', label: '리워드', icon: Gift },
]

export function AppShell() {
  const { signOut } = useAuth()
  const { market, myState, refreshing, refresh, setProfileSprite } = useMarket()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profilePickerOpen, setProfilePickerOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const nickname = myState?.participant?.nickname ?? '리그 참가 전'
  const profileSpriteIndex = myState?.participant?.profileSpriteIndex ?? 0
  const marketStatus = market?.league?.status === 'active'
    ? '거래소 운영 중'
    : market?.league?.status === 'registration'
      ? '리그 참가 접수 중'
      : market?.league?.status === 'finished'
        ? '리그 종료'
        : '리그 준비 중'

  async function handleProfileConfirm(index: number) {
    setProfileSaving(true)
    setProfileError(null)
    try {
      await setProfileSprite(index)
      setProfilePickerOpen(false)
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
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <Icon aria-hidden="true" size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="market-schedule">
            <span className="status-dot" />
            <div>
              <strong>24시간 주문 접수</strong>
              <small>매일 09:00 KST 일괄 체결</small>
            </div>
          </div>
          <button className="user-card" type="button" onClick={() => void signOut()} title="로그아웃">
            <SpriteIcon kind="profile" index={profileSpriteIndex} size="md" className="user-avatar" />
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
              <SpriteIcon kind="profile" index={profileSpriteIndex} size="sm" className="profile-trigger__avatar" />
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
                <SpriteIcon kind="profile" index={profileSpriteIndex} size="lg" />
                <span>
                  <strong>{nickname}</strong>
                  <small>{myState?.joined ? '익명 닉네임으로 참여 중' : '카카오 로그인 완료'}</small>
                </span>
              </div>
              {myState?.joined && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileError(null)
                    setProfilePickerOpen(true)
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
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
            <Icon aria-hidden="true" size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {profilePickerOpen && (
        <SpritePickerDialog
          kind="profile"
          value={profileSpriteIndex}
          title="프로필 이미지 선택"
          busy={profileSaving}
          error={profileError}
          onClose={() => setProfilePickerOpen(false)}
          onConfirm={(index) => void handleProfileConfirm(index)}
        />
      )}
    </div>
  )
}
