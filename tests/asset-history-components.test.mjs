// Static component-contract tests. Fixtures are test-only and never used by the app.
// Interactive browser and visual checks remain separate from these assertions.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
await fs.mkdir(path.join(root, 'tmp'), { recursive:true })
const workspace = await fs.mkdtemp(path.join(root, 'tmp', 'asset-history-test-'))
after(() => fs.rm(workspace, { recursive:true, force:true }))
const entry = path.join(workspace, 'entry.tsx')
await fs.writeFile(entry, `
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarketContext } from ${JSON.stringify(path.join(root, 'src/market/market-context'))}
import { RankingView } from ${JSON.stringify(path.join(root, 'src/features/RankingView'))}
import { AssetHistoryChart } from ${JSON.stringify(path.join(root, 'src/components/AssetHistoryChart'))}
export function renderRanking(value) { return renderToStaticMarkup(createElement(MarketContext.Provider, { value }, createElement(RankingView))) }
export function renderChart(points, nickname) { return renderToStaticMarkup(createElement(AssetHistoryChart, { points, nickname })) }
`)
await build({ configFile:false, logLevel:'silent', esbuild:{jsx:'automatic'}, build:{ ssr:entry, outDir:path.join(workspace,'out'), rollupOptions:{ output:{entryFileNames:'render.mjs'} } } })
const { renderRanking, renderChart } = await import(pathToFileURL(path.join(workspace,'out/render.mjs')).href)
const entries = [
  {rank:1,nickname:'플레이어A',netWorth:1250000,returnPercent:25,completedTradeCycles:5,longestHoldingRounds:3},
  {rank:2,nickname:'플레이어B',netWorth:0,returnPercent:-100,completedTradeCycles:2,longestHoldingRounds:1},
  {rank:3,nickname:'플레이어C',netWorth:-5000,returnPercent:-100.5,completedTradeCycles:1,longestHoldingRounds:4},
]
const state = () => ({ market:{league:{id:'test-league',status:'finished'}}, rankings:{isFinal:true,publishedAt:'2026-10-04T00:00:00Z',roundNumber:35,rankings:entries,awards:[]},myState:null })
const points = [
  {date:'2026-09-06',asOf:'2026-09-06T00:00:00Z',asOfInclusive:true,netWorth:1000000,roundNumber:7,kind:'snapshot'},
  {date:'2026-10-04',asOf:'2026-10-04T00:00:00Z',asOfInclusive:true,netWorth:-5000,roundNumber:35,kind:'snapshot'},
]

test('finished ranking buttons expose exact final assets, including zero and negative', () => {
  const html = renderRanking(state())
  assert.equal((html.match(/aria-haspopup="dialog"/g) ?? []).length,3)
  for (const entry of entries) assert.ok(html.includes(`${entry.netWorth.toLocaleString('ko-KR')} RP`))
  assert.ok(html.includes('최종 보유자산 (순자산)'))
})

test('active league keeps non-clickable rankings without asset values', () => {
  const value = state()
  value.market.league.status = 'active'
  value.rankings.isFinal = false
  const html = renderRanking(value)
  assert.equal((html.match(/<article class="ranking-row/g) ?? []).length,3)
  assert.ok(!html.includes('aria-haspopup="dialog"'))
  assert.ok(!html.includes(' RP'))
})

test('final RPC flag alone cannot expose assets when market is still active', () => {
  const value = state()
  value.market.league.status = 'active'
  const html = renderRanking(value)
  assert.ok(!html.includes('aria-haspopup="dialog"'))
  assert.ok(!html.includes('최종 보유자산'))
})

test('missing final results show final aggregation state without weekly schedule', () => {
  const value = state()
  value.rankings = null
  const html = renderRanking(value)
  assert.ok(html.includes('최종 순위를 집계하고 있습니다'))
  assert.ok(!html.includes('매주 일요일'))
})

test('accessible date table preserves recorded dates, negative values and missing days', () => {
  const html = renderChart(points,'플레이어C')
  assert.equal((html.match(/<tr>/g) ?? []).length,3)
  assert.ok(html.includes('2026.09.06'))
  assert.ok(html.includes('2026.10.04'))
  assert.ok(!html.includes('2026.09.07'))
  assert.ok(html.includes('-5,000 RP'))
  assert.ok(html.includes('-1,005,000 RP'))
  assert.ok(html.includes('날짜 선택'))
  assert.ok(html.includes('직전 기록 대비'))
})

test('one recorded point explains the point-only chart and omits a date slider', () => {
  const html = renderChart(points.slice(-1),'플레이어C')
  assert.ok(html.includes('기록이 1일만 있어 점으로 표시합니다.'))
  assert.ok(!html.includes('type="range"'))
})

test('empty chart renders no invented values', () => {
  assert.equal(renderChart([],'플레이어C'),'')
})


test('reconstructed table distinguishes day-end cutoffs from actual correction time', () => {
  const daily = [
    {date:'2026-10-03',asOf:'2026-10-04T00:00:00+09:00',asOfInclusive:false,netWorth:5000,roundNumber:null,kind:'day_end'},
    {date:'2026-10-04',asOf:'2026-10-04T11:30:27+09:00',asOfInclusive:true,netWorth:-5000,roundNumber:null,kind:'correction'},
  ]
  const html = renderChart(daily,'플레이어C')
  assert.ok(html.includes('일 마감 기준 (KST)'))
  assert.ok(html.includes('정정 반영'))
  assert.ok(html.includes('11:30'))
  assert.ok(!html.includes('null라운드'))
})
