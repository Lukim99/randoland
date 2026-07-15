import { ArrowLeft, ChevronRight, MessageSquareText, PenLine, Send, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router'
import { LeagueJoinCard } from '../components/LeagueJoinCard'
import { ProfileImage } from '../components/ProfileImage'
import { StockLogo } from '../components/StockLogo'
import { formatDiscussionTime, formatKstDateTime } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type { DiscussionPost, StockSummary } from '../types/market'

interface DiscussionComposerModalProps {
  title: string
  content: string
  message: string | null
  submitting: boolean
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function DiscussionComposerModal({
  title,
  content,
  message,
  submitting,
  onTitleChange,
  onContentChange,
  onClose,
  onSubmit,
}: DiscussionComposerModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    titleInputRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeRef.current()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return createPortal(
    <div
      className="discussion-composer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="discussion-composer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header>
          <div>
            <h2 id={titleId}>글쓰기</h2>
            <p id={descriptionId}>제목과 내용을 읽기 쉽게 작성해 주세요.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={submitting} aria-label="글쓰기 창 닫기">
            <X size={19} />
          </button>
        </header>

        <form onSubmit={onSubmit}>
          <label>
            <span>제목</span>
            <input
              ref={titleInputRef}
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              maxLength={80}
              placeholder="제목을 입력하세요"
              required
            />
            <small>{title.length}/80</small>
          </label>
          <label>
            <span>내용</span>
            <textarea
              value={content}
              onChange={(event) => onContentChange(event.target.value)}
              maxLength={2000}
              rows={8}
              placeholder="의견을 입력하세요"
              required
            />
            <small>{content.length}/2,000</small>
          </label>

          {message && <p className="form-message is-error" role="alert">{message}</p>}

          <footer>
            <button className="secondary-action-button" type="button" onClick={onClose} disabled={submitting}>취소</button>
            <button className="action-button" type="submit" disabled={submitting || !title.trim() || !content.trim()}>
              <Send size={16} /> {submitting ? '등록 중' : '게시글 등록'}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  )
}

function DiscussionStockList({ stocks }: { stocks: StockSummary[] }) {
  return (
    <section className="panel discussion-stock-directory" aria-labelledby="discussion-stock-list-title">
      <div className="section-heading">
        <div>
          <h2 id="discussion-stock-list-title">토론할 종목을 선택하세요</h2>
        </div>
        <span className="count-chip">{stocks.length}</span>
      </div>
      <nav className="discussion-stock-links" aria-label="상장 종목 토론방 목록">
        {stocks.map((stock) => (
          <Link key={stock.id} to={`/discussion/${stock.id}`}>
            <StockLogo
              src={stock.logoImageUrl}
              spriteIndex={stock.logoSpriteIndex}
              size="md"
              label={`${stock.name} 로고`}
            />
            <span>
              <strong>{stock.name}</strong>
              <small>{stock.ticker}</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </section>
  )
}

export function DiscussionPage() {
  const { stockId } = useParams()
  const { market, myState, loading, loadDiscussionPosts, createDiscussionPost } = useMarket()
  const selectedStock = stockId ? market?.stocks.find((stock) => stock.id === stockId) : undefined
  const [posts, setPosts] = useState<DiscussionPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedStock?.id) {
      setPosts([])
      setPostsError(null)
      return undefined
    }

    let active = true
    setPostsLoading(true)
    setPostsError(null)
    void loadDiscussionPosts(selectedStock.id)
      .then((nextPosts) => {
        if (active) setPosts(nextPosts)
      })
      .catch((error: unknown) => {
        if (active) setPostsError(error instanceof Error ? error.message : '게시글을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (active) setPostsLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadDiscussionPosts, selectedStock?.id])

  function closeComposer() {
    if (submitting) return
    setComposerOpen(false)
    setFormMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedStock) return

    const normalizedTitle = title.trim()
    const normalizedContent = content.trim()
    if (normalizedTitle.length < 1 || normalizedTitle.length > 80) {
      setFormMessage('제목은 1~80자로 입력해 주세요.')
      return
    }
    if (normalizedContent.length < 1 || normalizedContent.length > 2000) {
      setFormMessage('내용은 1~2,000자로 입력해 주세요.')
      return
    }

    setSubmitting(true)
    setFormMessage(null)
    setPageMessage(null)
    try {
      await createDiscussionPost(selectedStock.id, normalizedTitle, normalizedContent)
      const nextPosts = await loadDiscussionPosts(selectedStock.id)
      setPosts(nextPosts)
      setTitle('')
      setContent('')
      setComposerOpen(false)
      setPageMessage('게시글이 등록되었습니다.')
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : '게시글 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !market) {
    return <div className="skeleton skeleton--chart" aria-label="토론방 불러오는 중" />
  }

  if (!market?.stocks.length) {
    return (
      <div className="discussion-page">
        <header className="discussion-page-header">
          <span className="feature-icon"><MessageSquareText size={28} /></span>
          <h1>종목토론방</h1>
        </header>
        <section className="panel news-page-empty">
          <MessageSquareText size={30} />
          <h2>토론할 상장 종목이 없습니다</h2>
          <p>종목이 상장되면 토론방이 함께 열립니다.</p>
        </section>
      </div>
    )
  }

  if (stockId && !selectedStock) {
    return (
      <div className="discussion-page">
        <header className="discussion-page-header">
          <span className="feature-icon"><MessageSquareText size={28} /></span>
          <h1>종목을 찾을 수 없습니다</h1>
        </header>
        <section className="panel discussion-empty">
          <p>현재 토론할 수 있는 종목 목록에서 다시 선택해 주세요.</p>
          <Link className="secondary-action-button" to="/discussion">종목 목록으로</Link>
        </section>
      </div>
    )
  }

  return (
    <div className="discussion-page">
      {!selectedStock ? (
        <>
          <header className="discussion-page-header">
            <span className="feature-icon"><MessageSquareText size={28} /></span>
            <h1>종목토론방</h1>
          </header>
          <DiscussionStockList stocks={market.stocks} />
        </>
      ) : (
        <div className="discussion-board">
          <header className="panel discussion-board-header">
            <Link className="discussion-back-button" to="/discussion" aria-label="종목 목록으로 돌아가기">
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <StockLogo
              src={selectedStock.logoImageUrl}
              spriteIndex={selectedStock.logoSpriteIndex}
              size="lg"
              label={`${selectedStock.name} 로고`}
            />
            <div>
              <span className="eyebrow">{selectedStock.ticker}</span>
              <h1>{selectedStock.name} 토론방</h1>
            </div>
            <button
              className="action-button discussion-write-button"
              type="button"
              onClick={() => {
                setPageMessage(null)
                setComposerOpen(true)
              }}
              disabled={!myState?.joined}
              title={myState?.joined ? undefined : '리그 참가 후 글을 작성할 수 있습니다.'}
            >
              <PenLine size={16} /> 글쓰기
            </button>
          </header>

          {!myState?.joined && <LeagueJoinCard compact />}
          {pageMessage && <p className="form-message discussion-page-message" role="status">{pageMessage}</p>}

          <section className="discussion-feed" aria-live="polite" aria-busy={postsLoading}>
            {postsError && <p className="page-error" role="alert">{postsError}</p>}
            {postsLoading ? (
              <div className="skeleton skeleton--chart" aria-label="게시글 불러오는 중" />
            ) : posts.length > 0 ? posts.map((post) => (
              <article className="panel discussion-post" key={post.id}>
                <header className="discussion-post-author">
                  <ProfileImage
                    src={post.authorProfileImageUrl}
                    size="md"
                    label={`${post.authorNickname} 프로필 사진`}
                  />
                  <div>
                    <strong>{post.authorNickname}</strong>
                    <time dateTime={post.createdAt} title={formatKstDateTime(post.createdAt)}>
                      {formatDiscussionTime(post.createdAt)}
                    </time>
                  </div>
                </header>
                <div className="discussion-post-body">
                  <h2>{post.title}</h2>
                  <p>{post.content}</p>
                </div>
              </article>
            )) : (
              <div className="panel discussion-empty">
                <MessageSquareText size={23} />
                <p>아직 작성된 게시글이 없습니다.</p>
              </div>
            )}
          </section>

          {composerOpen && (
            <DiscussionComposerModal
              title={title}
              content={content}
              message={formMessage}
              submitting={submitting}
              onTitleChange={setTitle}
              onContentChange={setContent}
              onClose={closeComposer}
              onSubmit={(event) => void handleSubmit(event)}
            />
          )}
        </div>
      )}
    </div>
  )
}
