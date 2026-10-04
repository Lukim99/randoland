import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAssetHistory, formatAssetDate } from '../src/lib/asset-history.ts'

const point = (date, asOf, netWorth = 1000000, roundNumber = 1) => ({ date, asOf, asOfInclusive:true, netWorth, roundNumber, kind:'snapshot' })
const snapshots = (points) => ({source:'published_snapshots',status:'ready',formulaMode:null,correctionAt:null,points})
const reconstructed = (points, correctionAt = null) => ({source:'reconstructed_daily',status:'ready',formulaMode:'current_canonical_networth',correctionAt,points})
const dayEnd = {date:'2026-10-03',asOf:'2026-10-04T00:00:00+09:00',asOfInclusive:false,netWorth:1200000,roundNumber:null,kind:'day_end'}
const corrected = {date:'2026-10-04',asOf:'2026-10-04T11:30:27+09:00',asOfInclusive:true,netWorth:-5000,roundNumber:null,kind:'correction'}

test('keeps negative/zero values and sorts actual recorded dates', () => {
  const input = [point('2026-10-04','2026-10-04T00:00:00Z',-4700000,35),point('2026-09-06','2026-09-06T00:00:00Z',0,7)]
  assert.deepEqual(normalizeAssetHistory(snapshots(input)).points,[input[1],input[0]])
  assert.equal(input[0].date,'2026-10-04')
})

test('selects latest actual same-KST-day snapshot without fabricating days', () => {
  const early = point('2026-09-07','2026-09-06T15:10:00Z',900000,1)
  const late = point('2026-09-07','2026-09-07T00:00:00Z',1100000,2)
  assert.deepEqual(normalizeAssetHistory(snapshots([late,early])).points,[late])
  assert.deepEqual(normalizeAssetHistory(snapshots([early,late])).points,[late])
})

test('same-time snapshot ties use the actual round number', () => {
  const first = point('2026-09-07','2026-09-07T00:00:00Z',2,1)
  const last = point('2026-09-07','2026-09-07T00:00:00Z',3,2)
  assert.deepEqual(normalizeAssetHistory(snapshots([last,first])).points,[last])
})

test('accepts explicit exclusive KST day end and actual inclusive correction', () => {
  const history = reconstructed([dayEnd,corrected],corrected.asOf)
  assert.deepEqual(normalizeAssetHistory(history),history)
})

test('rejects false day-end cutoffs and corrections without matching provenance', () => {
  const bad = [
    reconstructed([{...dayEnd,asOfInclusive:true}]),
    reconstructed([{...dayEnd,asOf:'2026-10-03T23:00:00+09:00'}]),
    reconstructed([{...dayEnd,date:'2026-10-04'}]),
    reconstructed([corrected]),
    reconstructed([corrected],'2026-10-04T12:00:00+09:00'),
    snapshots([dayEnd]),
    reconstructed([point('2026-10-04','2026-10-04T00:00:00Z')]),
  ]
  for (const history of bad) assert.throws(()=>normalizeAssetHistory(history),/형식/)
})

test('requires explicit current-formula provenance for reconstruction', () => {
  assert.throws(()=>normalizeAssetHistory({...reconstructed([dayEnd]),formulaMode:null}),/형식/)
  assert.throws(()=>normalizeAssetHistory({...reconstructed([dayEnd]),formulaMode:'historically_observed'}),/형식/)
})

test('updating responses cannot show stale data', () => {
  const updating = {...reconstructed([]),status:'updating'}
  assert.deepEqual(normalizeAssetHistory(updating),updating)
  assert.throws(()=>normalizeAssetHistory({...updating,points:[dayEnd]}),/형식/)
})

test('empty and singleton histories retain their actual size', () => {
  assert.deepEqual(normalizeAssetHistory(snapshots([])).points,[])
  const one = point('2026-10-04','2026-10-04T00:00:00Z')
  assert.deepEqual(normalizeAssetHistory(snapshots([one])).points,[one])
})

test('rejects malformed values rather than inventing zero assets or dates', () => {
  const malformed = [null,{},'[]',[],snapshots([null]),snapshots([point('2026-09-06','2026-09-06T16:00:00Z')]),snapshots([point('2026-09-06','bad')]),snapshots([point('bad','2026-09-06')]),snapshots([point('2026-09-06','2026-09-06T00:00:00Z',NaN)]),snapshots([point('2026-09-06','2026-09-06T00:00:00Z',Infinity)]),snapshots([point('2026-09-06','2026-09-06T00:00:00Z','1000000')]),snapshots([point('2026-09-06','2026-09-06T00:00:00Z',1.5)]),snapshots([point('2026-09-06','2026-09-06T00:00:00Z',1,-1)])]
  for (const history of malformed) assert.throws(()=>normalizeAssetHistory(history),/형식/)
})

test('returns only public chart fields and provenance', () => {
  const one = point('2026-10-04','2026-10-04T00:00:00Z')
  assert.deepEqual(normalizeAssetHistory({...snapshots([{...one,privateField:'discard'}]),privateTopLevel:'discard'}),snapshots([one]))
})

test('formats dates without shifting timezone', () => {
  assert.equal(formatAssetDate('2026-10-04'),'2026.10.04')
})
