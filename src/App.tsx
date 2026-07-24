import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AuthGate } from './auth/AuthGate'
import { AdminGate } from './auth/AdminGate'
import { AppShell } from './components/AppShell'
import { MarketProvider } from './market/MarketProvider'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { LoginPage } from './pages/LoginPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const FeaturePage = lazy(() => import('./pages/FeaturePage').then((module) => ({ default: module.FeaturePage })))
const StockDetailPage = lazy(() => import('./pages/StockDetailPage').then((module) => ({ default: module.StockDetailPage })))
const StockNewsPage = lazy(() => import('./pages/StockNewsPage').then((module) => ({ default: module.StockNewsPage })))
const NewsPage = lazy(() => import('./pages/NewsPage').then((module) => ({ default: module.NewsPage })))
const DiscussionPage = lazy(() => import('./pages/DiscussionPage').then((module) => ({ default: module.DiscussionPage })))
const AdminPage = lazy(() => import('./admin/AdminPage').then((module) => ({ default: module.AdminPage })))

function loadPage(page: ReactNode) {
  return <Suspense fallback={<main className="route-loading" aria-label="화면 불러오는 중"><span className="brand-loader" /></main>}>{page}</Suspense>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<AuthGate />}>
        <Route element={<MarketProvider><AppShell /></MarketProvider>}>
          <Route index element={loadPage(<DashboardPage />)} />
          <Route path="stock/:stockId" element={loadPage(<StockDetailPage />)} />
          <Route path="stock/:stockId/news" element={loadPage(<StockNewsPage />)} />
          <Route path="news" element={loadPage(<NewsPage />)} />
          <Route path="discussion" element={loadPage(<DiscussionPage />)} />
          <Route path="discussion/:stockId" element={loadPage(<DiscussionPage />)} />
          <Route path="portfolio" element={loadPage(<FeaturePage kind="portfolio" />)} />
          <Route path="orders" element={loadPage(<FeaturePage kind="orders" />)} />
          <Route path="listing" element={loadPage(<FeaturePage kind="listing" />)} />
          <Route path="ranking" element={loadPage(<FeaturePage kind="ranking" />)} />
          <Route path="rewards" element={loadPage(<FeaturePage kind="rewards" />)} />
          <Route element={<AdminGate />}>
            <Route path="admin" element={loadPage(<AdminPage />)} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
