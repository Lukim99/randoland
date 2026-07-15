import { Upload, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { validateStockLogoFile } from '../lib/stock-logo'
import { StockLogo } from './StockLogo'

interface StockLogoUploadDialogProps {
  currentImageUrl?: string | null
  fallbackSpriteIndex: number
  busy?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (file: File) => void
}

function formatFileSize(size: number) {
  return `${Math.max(1, Math.ceil(size / 1024)).toLocaleString('ko-KR')}KB`
}

export function StockLogoUploadDialog({
  currentImageUrl,
  fallbackSpriteIndex,
  busy = false,
  error,
  onClose,
  onConfirm,
}: StockLogoUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const inputId = useId()

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
      return undefined
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(nextPreviewUrl)
    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [selectedFile])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  function handleFile(file: File | undefined) {
    if (!file) return
    const nextError = validateStockLogoFile(file)
    setValidationError(nextError)
    setSelectedFile(nextError ? null : file)
  }

  return createPortal(
    <div
      className="sprite-picker-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section
        className="sprite-picker-dialog profile-upload-dialog stock-logo-upload-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header>
          <div>
            <span className="eyebrow">내 상장 종목</span>
            <h2 id={titleId}>종목 로고 업로드</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="창 닫기">
            <X size={18} />
          </button>
        </header>

        <div className="profile-upload-preview stock-logo-upload-preview">
          <StockLogo
            src={previewUrl ?? currentImageUrl}
            spriteIndex={fallbackSpriteIndex}
            size="xl"
            label="종목 로고 미리보기"
          />
          <div>
            <strong>{selectedFile?.name ?? '현재 종목 로고'}</strong>
            <p id={descriptionId}>PNG, JPG, WEBP · 최대 1MB</p>
            {selectedFile && <small>{formatFileSize(selectedFile.size)}</small>}
          </div>
        </div>

        <label className="profile-upload-field" htmlFor={inputId} aria-disabled={busy}>
          <Upload size={20} aria-hidden="true" />
          <span>
            <strong>이미지 파일 선택</strong>
            <small>정사각형 이미지를 권장합니다.</small>
          </span>
          <input
            id={inputId}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label>

        {(validationError || error) && (
          <p className="form-message is-error" role="alert">{validationError ?? error}</p>
        )}

        <footer>
          <button className="secondary-action-button" type="button" onClick={onClose} disabled={busy}>취소</button>
          <button
            className="action-button"
            type="button"
            onClick={() => selectedFile && onConfirm(selectedFile)}
            disabled={busy || !selectedFile}
          >
            {busy ? '업로드 중' : '로고 사용'}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
