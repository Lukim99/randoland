import { Building2, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { StockLogo } from '../components/StockLogo'
import { formatPrice } from '../lib/format'
import { delistAdminStock, listAdminStock } from '../services/admin'
import type { AdminActionRunner, AdminLeague, AdminStock } from '../types/admin'

interface StockAdminPanelProps {
  leagues: AdminLeague[]
  stocks: AdminStock[]
  busy: boolean
  onRun: AdminActionRunner
}

const emptyStories = ['', '', '', '', '']

export function StockAdminPanel({ leagues, stocks, busy, onRun }: StockAdminPanelProps) {
  const operatingLeagues = leagues.filter(({ status }) => status === 'registration' || status === 'active')
  const removableStocks = stocks.filter(({ status }) => status === 'pending' || status === 'active' || status === 'halted')
  const [leagueId, setLeagueId] = useState('')
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [initialPrice, setInitialPrice] = useState('10000')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState('')
  const [logoSpriteIndex, setLogoSpriteIndex] = useState(0)
  const [weeklyStories, setWeeklyStories] = useState<string[]>(emptyStories)
  const [removeStockId, setRemoveStockId] = useState('')
  const [removeReason, setRemoveReason] = useState('')
  const selectedLeagueId = operatingLeagues.some(({ id }) => id === leagueId) ? leagueId : operatingLeagues[0]?.id ?? ''
  const selectedRemoveStockId = removableStocks.some(({ id }) => id === removeStockId) ? removeStockId : removableStocks[0]?.id ?? ''
  const selectedRemoveStock = stocks.find(({ id }) => id === selectedRemoveStockId)
  const leagueNameById = new Map(leagues.map((league) => [league.id, league.name]))

  function changeStory(index: number, value: string) {
    setWeeklyStories((stories) => stories.map((story, storyIndex) => storyIndex === index ? value : story))
  }

  async function handleList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedLeagueId) return
    const completed = await onRun(
      () => listAdminStock({
        leagueId: selectedLeagueId,
        ticker,
        name,
        initialPrice: Number(initialPrice),
        description,
        theme,
        weeklyStories,
        logoSpriteIndex,
      }),
      `${name} 종목을 상장했습니다.`,
    )
    if (completed) {
      setTicker('')
      setName('')
      setDescription('')
      setTheme('')
      setWeeklyStories(emptyStories)
    }
  }

  async function handleRemove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRemoveStock) return
    if (!window.confirm(`${selectedRemoveStock.name} 종목을 시장에서 제거하시겠습니까? 이력은 보존됩니다.`)) return
    const completed = await onRun(
      () => delistAdminStock(selectedRemoveStock.id, removeReason),
      `${selectedRemoveStock.name} 종목을 시장에서 제거했습니다.`,
    )
    if (completed) setRemoveReason('')
  }

  return (
    <section className="admin-panel admin-panel--stock">
      <header className="admin-panel__header">
        <span className="admin-panel__icon"><Building2 size={19} aria-hidden="true" /></span>
        <div><span className="eyebrow">STOCK</span><h2>종목 상장·제거</h2></div>
      </header>

      <div className="admin-stock-list">
        {stocks.map((stock) => (
          <article key={stock.id} className="admin-stock-row">
            <StockLogo src={stock.logoImageUrl} spriteIndex={stock.logoSpriteIndex} size="sm" label={`${stock.name} 로고`} />
            <div><strong>{stock.name} <small>{stock.ticker}</small></strong><span>{leagueNameById.get(stock.leagueId)} · {formatPrice(stock.currentPrice)} RP</span></div>
            <span className={`admin-status admin-status--${stock.status}`}>{stock.status === 'active' ? '거래 중' : stock.status === 'delisted' ? '제거됨' : stock.status === 'halted' ? '거래 정지' : stock.status}</span>
          </article>
        ))}
      </div>

      <form className="admin-form" onSubmit={(event) => void handleList(event)}>
        <h3>관리자 종목 상장</h3>
        <div className="admin-form__columns">
          <label><span>리그</span><select value={selectedLeagueId} onChange={(event) => setLeagueId(event.target.value)} disabled={operatingLeagues.length === 0}>{operatingLeagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></label>
          <label><span>티커</span><input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} pattern="[A-Z0-9]{2,8}" maxLength={8} required /></label>
          <label><span>종목명</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} required /></label>
          <label><span>초기 가격</span><input type="number" min="1" step="1" value={initialPrice} onChange={(event) => setInitialPrice(event.target.value)} required /></label>
          <label><span>테마</span><input value={theme} onChange={(event) => setTheme(event.target.value)} maxLength={120} /></label>
          <label><span>로고 번호</span><input type="number" min="0" max="99" value={logoSpriteIndex} onChange={(event) => setLogoSpriteIndex(Number(event.target.value))} required /></label>
        </div>
        <label><span>종목 설명</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={1000} rows={4} required /></label>
        <fieldset className="admin-story-fields"><legend>주차별 이야기</legend>{weeklyStories.map((story, index) => <label key={index}><span>{index + 1}주차</span><textarea value={story} onChange={(event) => changeStory(index, event.target.value)} minLength={5} maxLength={2000} rows={2} required /></label>)}</fieldset>
        <button className="primary-button" type="submit" disabled={busy || !selectedLeagueId}>종목 상장</button>
      </form>

      <form className="admin-form admin-form--danger" onSubmit={(event) => void handleRemove(event)}>
        <h3><Trash2 size={16} aria-hidden="true" /> 시장에서 제거</h3>
        <label><span>대상 종목</span><select value={selectedRemoveStockId} onChange={(event) => setRemoveStockId(event.target.value)} disabled={removableStocks.length === 0}>{removableStocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.name} · {stock.ticker}</option>)}</select></label>
        <label><span>제거 사유</span><textarea value={removeReason} onChange={(event) => setRemoveReason(event.target.value)} minLength={5} maxLength={500} rows={3} required /></label>
        <p className="admin-form__hint">보유·공매도 포지션이 남은 종목은 제거할 수 없습니다. 종목과 과거 이력은 삭제하지 않습니다.</p>
        <button className="danger-button" type="submit" disabled={busy || !selectedRemoveStockId}>종목 제거</button>
      </form>
    </section>
  )
}
