import { Check, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { SPRITE_ICON_COUNT } from '../lib/sprites'
import { SpriteIcon, type SpriteKind } from './SpriteIcon'

const spriteIndices = Array.from({ length: SPRITE_ICON_COUNT }, (_, index) => index)

interface SpritePickerDialogProps {
  kind: SpriteKind
  value: number
  title: string
  busy?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (index: number) => void
}

export function SpritePickerDialog({
  kind,
  value,
  title,
  busy = false,
  error,
  onClose,
  onConfirm,
}: SpritePickerDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState(value)
  const titleId = useId()
  const kindLabel = '종목 이미지'

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  return createPortal(
    <div
      className="sprite-picker-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section className="sprite-picker-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <div>
            <span className="eyebrow">100개 중 선택</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="선택 창 닫기">
            <X size={18} />
          </button>
        </header>

        <div className="sprite-picker-preview">
          <SpriteIcon kind={kind} index={selectedIndex} size="xl" label={`선택한 ${kindLabel}`} />
          <span><small>선택 번호</small><strong>{selectedIndex + 1}</strong></span>
        </div>

        <div className="sprite-picker-grid" role="listbox" aria-label={kindLabel}>
          {spriteIndices.map((index) => (
            <button
              key={index}
              type="button"
              role="option"
              aria-selected={selectedIndex === index}
              aria-label={`${kindLabel} ${index + 1}`}
              className={selectedIndex === index ? 'is-selected' : undefined}
              onClick={() => setSelectedIndex(index)}
              disabled={busy}
            >
              <SpriteIcon kind={kind} index={index} size="md" />
              {selectedIndex === index && <Check size={12} aria-hidden="true" />}
            </button>
          ))}
        </div>

        {error && <p className="form-message is-error" role="alert">{error}</p>}

        <footer>
          <button className="secondary-action-button" type="button" onClick={onClose} disabled={busy}>취소</button>
          <button className="action-button" type="button" onClick={() => onConfirm(selectedIndex)} disabled={busy}>
            {busy ? '저장 중' : '이 이미지 사용'}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
