import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChartNoAxesCombined, RefreshCw, X } from 'lucide-react'
import { formatKstDateTime, formatPercent, formatRp, movementClass } from '../lib/format'
import { loadParticipantAssetHistory } from '../services/asset-history'
import type { ParticipantAssetHistory, RankingEntry } from '../types/market'
import { AssetHistoryChart } from './AssetHistoryChart'

interface Props {
  leagueId: string
  entry: RankingEntry
  onClose: () => void
}

export function ParticipantAssetHistoryDialog({ leagueId, entry, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ history: ParticipantAssetHistory | null; error: string | null } | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadParticipantAssetHistory(leagueId, entry.nickname, controller.signal)
      .then((history) => {
        if (!controller.signal.aborted) setResult({ history, error: null })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ history: null, error: error instanceof Error ? error.message : '자산 기록을 불러오지 못했습니다.' })
      })
    return () => controller.abort()
  }, [leagueId, entry.nickname, attempt])

  return createPortal(
    <dialog ref={dialogRef} className="asset-history-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
      }}>
      <header className="asset-history-dialog__header">
        <div><span>최종 {entry.rank}위</span><h2 id={titleId}>{entry.nickname}의 자산 변동</h2></div>
        <button className="icon-button" type="button" aria-label="자산 변동 창 닫기" onClick={onClose} autoFocus><X size={20} /></button>
      </header>
      <div className="asset-history-dialog__body">
        <div className="asset-history-final">
          <div><span>최종 보유자산 (순자산)</span><strong>{formatRp(entry.netWorth)}</strong></div>
          <div><span>최종 수익률</span><strong className={movementClass(entry.returnPercent)}>{formatPercent(entry.returnPercent)}</strong></div>
        </div>
        <p id={descriptionId} className="asset-history-note">{!result?.history ? 'KST 기준으로 해당 참가자의 자산 변동을 확인합니다.'
          : result.history.source === 'reconstructed_daily' ? '현재 순자산 산식으로 거래·RP 내역을 복원했습니다. 각 날짜 마감 기준(KST)입니다.'
            : '저장된 주간·최종 정산 기록을 KST 날짜별로 표시합니다. 기록이 없는 날짜는 표시하지 않습니다.'}</p>
        {result?.history?.source === 'reconstructed_daily' && result.history.correctionAt && <p className="asset-history-correction">마지막 기록은 {formatKstDateTime(result.history.correctionAt)} KST 정정 반영 값입니다.</p>}
        {!result ? <div className="asset-history-state" role="status"><span className="brand-loader" aria-hidden="true" /><p>자산 기록을 불러오는 중입니다.</p></div>
          : result.error ? <div className="asset-history-state" role="alert"><p>{result.error}</p><button type="button" className="secondary-action-button" onClick={() => { setResult(null); setAttempt((value) => value + 1) }}><RefreshCw size={15} />다시 시도</button></div>
            : result.history?.status === 'updating' ? <div className="asset-history-state" role="status"><RefreshCw size={28} /><strong>자산 기록 확인이 필요합니다</strong><p>최종 결과가 변경되었습니다. 운영자가 기록을 갱신하면 다시 확인할 수 있습니다.</p></div>
              : !result.history?.points.length ? <div className="asset-history-state"><ChartNoAxesCombined size={28} /><strong>저장된 일자별 자산 기록이 없습니다</strong><p>최종 보유자산은 위 순위 집계 금액으로 확인할 수 있습니다.</p></div>
                : <AssetHistoryChart points={result.history.points} nickname={entry.nickname} />}
      </div>
    </dialog>, document.body,
  )
}
