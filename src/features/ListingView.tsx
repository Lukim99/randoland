import { Building2, FileText, ImageIcon, Layers3 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SpriteIcon } from '../components/SpriteIcon'
import { SpritePickerDialog } from '../components/SpritePickerDialog'
import { formatPrice } from '../lib/format'
import { useMarket } from '../market/useMarket'
import { ParticipantGate } from './ParticipantGate'

const initialStories = ['', '', '', '', '']

export function ListingView() {
  const { market, myState, submitListing, setStockLogo } = useMarket()
  const listing = myState?.listing
  const listingStock = listing ? market?.stocks.find((stock) => stock.id === listing.id) : null
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [initialPrice, setInitialPrice] = useState(1000)
  const [theme, setTheme] = useState('')
  const [description, setDescription] = useState('')
  const [stories, setStories] = useState(initialStories)
  const [logoSpriteIndex, setLogoSpriteIndex] = useState(0)
  const [spritePickerOpen, setSpritePickerOpen] = useState(false)
  const [spriteSaving, setSpriteSaving] = useState(false)
  const [spriteError, setSpriteError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function updateStory(index: number, value: string) {
    setStories((current) => current.map((story, storyIndex) => storyIndex === index ? value : story))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    const normalizedTicker = ticker.trim().toUpperCase()
    const lastStoryIndex = stories.reduce(
      (lastIndex, story, index) => story.trim().length > 0 ? index : lastIndex,
      -1,
    )
    const submittedStories = stories.slice(0, lastStoryIndex + 1).map((story) => story.trim())

    if (!/^[A-Z0-9]{2,8}$/.test(normalizedTicker)) {
      setMessage('티커는 영문 대문자와 숫자 2~8자로 입력해 주세요.')
      return
    }
    if (name.trim().length < 2 || name.trim().length > 40) {
      setMessage('상장명은 2~40자로 입력해 주세요.')
      return
    }
    if (!Number.isInteger(initialPrice) || initialPrice < 1) {
      setMessage('상장 주가는 1 RP 이상의 정수로 입력해 주세요.')
      return
    }
    if (description.trim().length < 10 || description.trim().length > 1000) {
      setMessage('종목 설명은 10~1,000자로 입력해 주세요.')
      return
    }
    if (submittedStories.length === 0 || submittedStories.some((story) => story.length < 5)) {
      setMessage('1주차부터 순서대로 각 5자 이상의 이야기를 입력해 주세요.')
      return
    }

    setSubmitting(true)
    try {
      await submitListing({
        logoSpriteIndex,
        ticker: normalizedTicker,
        name: name.trim(),
        initialPrice,
        description: description.trim(),
        theme: theme.trim(),
        weeklyStories: submittedStories,
      })
      setMessage('종목이 상장되었습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '종목 상장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogoConfirm(index: number) {
    if (!listing) {
      setLogoSpriteIndex(index)
      setSpritePickerOpen(false)
      return
    }

    setSpriteSaving(true)
    setSpriteError(null)
    try {
      await setStockLogo(listing.id, index)
      setMessage('종목 이미지가 변경되었습니다.')
      setSpritePickerOpen(false)
    } catch (error) {
      setSpriteError(error instanceof Error ? error.message : '종목 이미지 변경에 실패했습니다.')
    } finally {
      setSpriteSaving(false)
    }
  }

  const currentLogoSpriteIndex = listingStock?.logoSpriteIndex ?? logoSpriteIndex

  return (
    <ParticipantGate>
      <>
        {listing ? (
          <div className="feature-stack">
            <section className="panel listed-stock-card">
              <SpriteIcon kind="stock" index={currentLogoSpriteIndex} size="xl" className="listed-stock-card__mark" label={`${listing.name} 종목 이미지`} />
              <div>
                <span className="eyebrow">{listing.ticker} · 상장 완료</span>
                <h2>{listing.name}</h2>
                <p>{listing.description}</p>
                <button
                  className="inline-image-button"
                  type="button"
                  onClick={() => {
                    setSpriteError(null)
                    setSpritePickerOpen(true)
                  }}
                >
                  <ImageIcon size={14} /> 종목 이미지 변경
                </button>
              </div>
              <dl>
                <div><dt>현재가</dt><dd>{formatPrice(listing.currentPrice)} RP</dd></div>
                <div><dt>상장가</dt><dd>{formatPrice(listing.initialPrice)} RP</dd></div>
                <div><dt>테마</dt><dd>{listing.theme || '미지정'}</dd></div>
              </dl>
            </section>
            {message && <p className="form-message" role="status">{message}</p>}
            <section className="panel live-section">
              <div className="section-heading section-heading--compact"><div><span className="eyebrow">AI 뉴스 기반 자료</span><h2>주차별 흐름</h2></div><Layers3 size={18} /></div>
              <div className="story-timeline">
                {listing.stories.map((story) => (
                  <article key={story.weekNumber}><span>{story.weekNumber}주차</span><p>{story.story}</p></article>
                ))}
              </div>
            </section>
            <p className="feature-footnote">참가자당 한 종목만 상장할 수 있으며 본인 종목은 주문할 수 없습니다.</p>
          </div>
        ) : (
          <form className="panel listing-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="section-heading section-heading--compact">
              <div><span className="eyebrow">참가자당 한 종목</span><h2>상장 정보 입력</h2></div>
              <Building2 size={19} />
            </div>

            <div className="sprite-field">
              <SpriteIcon kind="stock" index={logoSpriteIndex} size="xl" label="선택한 종목 이미지" />
              <div><strong>종목 이미지</strong><span>종목을 구분할 심볼을 선택합니다.</span></div>
              <button
                type="button"
                onClick={() => {
                  setSpriteError(null)
                  setSpritePickerOpen(true)
                }}
              >
                <ImageIcon size={14} /> 이미지 선택
              </button>
            </div>

            <div className="form-grid form-grid--three">
              <label><span>티커</span><input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={8} placeholder="예: RND2" required /></label>
              <label><span>상장명</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder="종목 이름" required /></label>
              <label><span>상장 주가</span><div className="input-with-unit"><input type="number" min="1" step="1" value={initialPrice} onChange={(event) => setInitialPrice(Number(event.target.value))} required /><span>RP</span></div></label>
            </div>
            <label className="full-field"><span>테마·컨셉</span><input value={theme} onChange={(event) => setTheme(event.target.value)} maxLength={100} placeholder="종목의 핵심 테마를 짧게 입력" /></label>
            <label className="full-field"><span>종목 설명</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={1000} rows={5} placeholder="종목의 설정, 사업, 인물과 시장에서의 특징을 구체적으로 설명해 주세요." required /><small>{description.length}/1,000</small></label>

            <div className="story-form-section">
              <div><FileText size={18} /><span><strong>주차별 흐름·이야기</strong><small>1주차부터 필요한 주차까지 연속으로 작성해 주세요.</small></span></div>
              {stories.map((story, index) => (
                <label key={index}><span>{index + 1}주차</span><textarea value={story} onChange={(event) => updateStory(index, event.target.value)} minLength={index === 0 ? 5 : undefined} maxLength={2000} rows={3} required={index === 0} placeholder={`${index + 1}주차에 일어날 주요 사건과 가격 흐름의 단서`} /></label>
              ))}
            </div>

            {message && <p className={`form-message${message.includes('상장되었습니다') ? '' : ' is-error'}`} role="status">{message}</p>}
            <button className="action-button action-button--wide" type="submit" disabled={submitting}>
              {submitting ? '상장 처리 중' : '종목 상장하기'}
            </button>
          </form>
        )}

        {spritePickerOpen && (
          <SpritePickerDialog
            kind="stock"
            value={currentLogoSpriteIndex}
            title="종목 이미지 선택"
            busy={spriteSaving}
            error={spriteError}
            onClose={() => setSpritePickerOpen(false)}
            onConfirm={(index) => void handleLogoConfirm(index)}
          />
        )}
      </>
    </ParticipantGate>
  )
}
