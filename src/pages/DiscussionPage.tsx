import { ArrowLeft, ChevronRight, Heart, MessageCircle, MessageSquareText, Paperclip, PenLine, Send, Star, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router'
import { LeagueJoinCard } from '../components/LeagueJoinCard'
import { ProfileImage } from '../components/ProfileImage'
import { StockLogo } from '../components/StockLogo'
import { formatDiscussionTime, formatKstDateTime, formatPercent, formatPrice, movementClass } from '../lib/format'
import { useMarket } from '../market/useMarket'
import type {
  DiscussionAttachment,
  DiscussionAttachmentInput,
  DiscussionPost,
  DiscussionSort,
  RecentDiscussionPost,
  StockSummary,
} from '../types/market'

interface DiscussionAttachmentOption {
  input: DiscussionAttachmentInput
  label: string
  detail: string
}

interface DiscussionComposerModalProps {
  title: string
  content: string
  message: string | null
  submitting: boolean
  attachmentOptions: DiscussionAttachmentOption[]
  attachment: DiscussionAttachmentInput | null
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  onAttachmentChange: (value: DiscussionAttachmentInput | null) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function DiscussionComposerModal({
  title,
  content,
  message,
  submitting,
  attachmentOptions,
  attachment,
  onTitleChange,
  onContentChange,
  onAttachmentChange,
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

          <fieldset className="discussion-attachment-picker">
            <legend><Paperclip size={15} /> 보유종목·체결결과 첨부 <small>선택</small></legend>
            {attachmentOptions.length > 0 ? (
              <div>
                {attachmentOptions.map((option) => {
                  const selected = attachment?.type === option.input.type
                    && attachment.referenceId === option.input.referenceId
                  return (
                    <button
                      key={`${option.input.type}-${option.input.referenceId}`}
                      className={selected ? 'is-selected' : undefined}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onAttachmentChange(selected ? null : option.input)}
                    >
                      <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                      <span>{selected ? '첨부됨' : '첨부'}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p>이 종목에 첨부할 보유 내역이나 체결 결과가 없습니다.</p>
            )}
          </fieldset>

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

interface DiscussionStockListProps {
  stocks: StockSummary[]
  favoriteStockIds: ReadonlySet<string>
  canFavorite: boolean
  onToggleFavorite: (stock: StockSummary, favorited: boolean) => void
}

function DiscussionStockList({
  stocks,
  favoriteStockIds,
  canFavorite,
  onToggleFavorite,
}: DiscussionStockListProps) {
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
          <div className="discussion-stock-link-row" key={stock.id}>
            <Link to={`/discussion/${stock.id}`}>
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
            <button
              className={`favorite-button${favoriteStockIds.has(stock.id) ? ' is-active' : ''}`}
              type="button"
              aria-label={`${stock.name} 즐겨찾기 ${favoriteStockIds.has(stock.id) ? '해제' : '추가'}`}
              aria-pressed={favoriteStockIds.has(stock.id)}
              disabled={!canFavorite}
              title={canFavorite ? undefined : '리그 참가 후 즐겨찾기를 사용할 수 있습니다.'}
              onClick={() => onToggleFavorite(stock, !favoriteStockIds.has(stock.id))}
            >
              <Star size={17} fill={favoriteStockIds.has(stock.id) ? 'currentColor' : 'none'} />
            </button>
          </div>
        ))}
      </nav>
    </section>
  )
}

function DiscussionFavoriteStocks({ stocks }: { stocks: StockSummary[] }) {
  if (stocks.length === 0) return null

  return (
    <section className="panel discussion-favorites" aria-labelledby="discussion-favorites-title">
      <div className="section-heading section-heading--compact">
        <div>
          <span className="eyebrow">FAVORITES</span>
          <h2 id="discussion-favorites-title">즐겨찾기 토론방</h2>
        </div>
        <span className="count-chip">{stocks.length}</span>
      </div>
      <div className="discussion-favorite-links">
        {stocks.map((stock) => (
          <Link key={stock.id} to={`/discussion/${stock.id}`}>
            <StockLogo
              src={stock.logoImageUrl}
              spriteIndex={stock.logoSpriteIndex}
              size="sm"
              label={`${stock.name} 로고`}
            />
            <span><strong>{stock.name}</strong><small>{stock.ticker}</small></span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  )
}

function DiscussionAttachmentCard({ attachment }: { attachment: DiscussionAttachment }) {
  if (attachment.type === 'position') {
    return (
      <div className="discussion-attachment-card">
        <div>
          <span>{attachment.positionType === 'long' ? '보유종목' : '공매도 보유'}</span>
          <small>게시 시점</small>
        </div>
        <strong>{attachment.stockName} {formatPrice(attachment.quantity)}주</strong>
        <p className={movementClass(attachment.profit)}>
          {attachment.profit > 0 ? '+' : ''}{formatPrice(attachment.profit)} RP
          <span>({formatPercent(attachment.returnPercent)})</span>
        </p>
        <small>평균 {formatPrice(attachment.averagePrice)} RP · 현재 {formatPrice(attachment.currentPrice)} RP</small>
      </div>
    )
  }

  const sideLabel = {
    buy: '매수',
    sell: '매도',
    short: '공매도',
    cover: '공매도 청산',
  }[attachment.side]

  return (
    <div className="discussion-attachment-card">
      <div><span>{sideLabel} 체결</span><small>{attachment.executedAt ? formatKstDateTime(attachment.executedAt) : '체결 완료'}</small></div>
      <strong>{attachment.stockName} {formatPrice(attachment.quantity)}주</strong>
      <p>{formatPrice(attachment.totalAmount)} RP</p>
      <small>1주당 {formatPrice(attachment.executionPrice)} RP · {attachment.leveragePercent > 0 ? `레버리지 ${attachment.leveragePercent}%` : `${attachment.ticker} ${attachment.side.toUpperCase()}`}</small>
      {attachment.realizedProfit !== null && (
        <p className={`discussion-attachment-result ${movementClass(attachment.realizedProfit)}`}>
          실현손익 {attachment.realizedProfit > 0 ? '+' : ''}{formatPrice(attachment.realizedProfit)} RP
          {attachment.realizedReturn !== null && ` (${formatPercent(attachment.realizedReturn)})`}
        </p>
      )}
    </div>
  )
}

interface DiscussionPostCardProps {
  post: DiscussionPost
  canInteract: boolean
  liking: boolean
  onLike: (post: DiscussionPost) => Promise<void>
  onComment: (postId: string, content: string) => Promise<void>
}

function DiscussionPostCard({
  post,
  canInteract,
  liking,
  onLike,
  onComment,
}: DiscussionPostCardProps) {
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedContent = commentDraft.trim()
    if (!normalizedContent || normalizedContent.length > 1000) return

    setCommentSubmitting(true)
    setActionMessage(null)
    try {
      await onComment(post.id, normalizedContent)
      setCommentDraft('')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '댓글을 등록하지 못했습니다.')
    } finally {
      setCommentSubmitting(false)
    }
  }

  async function handleLike() {
    setActionMessage(null)
    try {
      await onLike(post)
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '좋아요를 변경하지 못했습니다.')
    }
  }

  return (
    <article className="panel discussion-post">
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
        {post.attachment && <DiscussionAttachmentCard attachment={post.attachment} />}
      </div>

      <div className="discussion-post-actions" aria-label="게시글 반응">
        <button
          className={post.likedByMe ? 'is-active' : undefined}
          type="button"
          aria-pressed={post.likedByMe}
          disabled={!canInteract || liking}
          title={canInteract ? undefined : '리그 참가 후 좋아요를 누를 수 있습니다.'}
          onClick={() => void handleLike()}
        >
          <Heart size={17} fill={post.likedByMe ? 'currentColor' : 'none'} aria-hidden="true" />
          좋아요 {post.likeCount}
        </button>
        <span><MessageCircle size={17} aria-hidden="true" /> 댓글 {post.commentCount}</span>
      </div>

      <section className="discussion-comments" aria-label={`${post.title} 댓글`}>
        {post.comments.length > 0 && (
          <div className="discussion-comment-list">
            {post.comments.map((comment) => (
              <article className="discussion-comment" key={comment.id}>
                <ProfileImage
                  src={comment.authorProfileImageUrl}
                  size="sm"
                  label={`${comment.authorNickname} 프로필 사진`}
                />
                <div>
                  <header>
                    <strong>{comment.authorNickname}</strong>
                    <time dateTime={comment.createdAt} title={formatKstDateTime(comment.createdAt)}>
                      {formatDiscussionTime(comment.createdAt)}
                    </time>
                  </header>
                  <p>{comment.content}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {canInteract ? (
          <form className="discussion-comment-form" onSubmit={(event) => void handleCommentSubmit(event)}>
            <label className="sr-only" htmlFor={`discussion-comment-${post.id}`}>댓글 내용</label>
            <input
              id={`discussion-comment-${post.id}`}
              value={commentDraft}
              maxLength={1000}
              placeholder="댓글을 입력하세요"
              disabled={commentSubmitting}
              onChange={(event) => setCommentDraft(event.target.value)}
            />
            <button type="submit" disabled={commentSubmitting || !commentDraft.trim()}>
              <Send size={15} aria-hidden="true" /> {commentSubmitting ? '등록 중' : '등록'}
            </button>
          </form>
        ) : (
          <p className="discussion-comment-gate">리그 참가 후 댓글을 작성할 수 있습니다.</p>
        )}
        {actionMessage && <p className="form-message is-error" role="alert">{actionMessage}</p>}
      </section>
    </article>
  )
}

interface DiscussionRecentFeedProps {
  posts: RecentDiscussionPost[]
  stocks: StockSummary[]
  loading: boolean
  error: string | null
}

function DiscussionRecentFeed({ posts, stocks, loading, error }: DiscussionRecentFeedProps) {
  const stockById = new Map(stocks.map((stock) => [stock.id, stock]))

  return (
    <section className="panel discussion-recent" aria-labelledby="discussion-recent-title" aria-busy={loading}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ALL STOCKS</span>
          <h2 id="discussion-recent-title">전체 종목 최신글</h2>
        </div>
        <span className="count-chip">{posts.length}</span>
      </div>

      {error ? (
        <p className="page-error" role="alert">{error}</p>
      ) : loading ? (
        <div className="skeleton skeleton--chart" aria-label="최신 게시글 불러오는 중" />
      ) : posts.length > 0 ? (
        <div className="discussion-recent-list">
          {posts.map((post) => {
            const stock = stockById.get(post.stockId)
            return (
              <Link className="discussion-recent-item" to={`/discussion/${post.stockId}`} key={post.id}>
                <StockLogo
                  src={stock?.logoImageUrl ?? null}
                  spriteIndex={stock?.logoSpriteIndex ?? 0}
                  size="sm"
                  label={`${post.stockName} 로고`}
                />
                <span className="discussion-recent-copy">
                  <span className="discussion-recent-stock">{post.stockName} <small>{post.ticker}</small></span>
                  <strong>{post.title}</strong>
                  <small>{post.authorNickname} · <time dateTime={post.createdAt} title={formatKstDateTime(post.createdAt)}>{formatDiscussionTime(post.createdAt)}</time></small>
                  <span className="discussion-recent-reactions">
                    <span><Heart size={13} aria-hidden="true" /> {post.likeCount}</span>
                    <span><MessageCircle size={13} aria-hidden="true" /> {post.commentCount}</span>
                  </span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="discussion-empty discussion-recent-empty">
          <MessageSquareText size={23} />
          <p>아직 작성된 게시글이 없습니다.</p>
        </div>
      )}
    </section>
  )
}

export function DiscussionPage() {
  const { stockId } = useParams()
  const {
    market,
    myState,
    favoriteStockIds,
    loading,
    loadRecentDiscussionPosts,
    loadDiscussionPosts,
    createDiscussionPost,
    setStockFavorite,
    setDiscussionPostLike,
    createDiscussionComment,
  } = useMarket()
  const favoriteStockIdSet = useMemo(() => new Set(favoriteStockIds), [favoriteStockIds])
  const discussionStocks = useMemo(() => {
    const stocks = market?.stocks.filter((stock) => stock.status !== 'delisted') ?? []
    return [...stocks].sort((left, right) => Number(favoriteStockIdSet.has(right.id)) - Number(favoriteStockIdSet.has(left.id)))
  }, [favoriteStockIdSet, market?.stocks])
  const favoriteStocks = discussionStocks.filter((stock) => favoriteStockIdSet.has(stock.id))
  const selectedStock = stockId ? discussionStocks.find((stock) => stock.id === stockId) : undefined
  const [posts, setPosts] = useState<DiscussionPost[]>([])
  const [postSort, setPostSort] = useState<DiscussionSort>('latest')
  const [likingPostId, setLikingPostId] = useState<string | null>(null)
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [recentPosts, setRecentPosts] = useState<RecentDiscussionPost[]>([])
  const [recentPostsLoading, setRecentPostsLoading] = useState(false)
  const [recentPostsError, setRecentPostsError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [attachment, setAttachment] = useState<DiscussionAttachmentInput | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<string | null>(null)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)

  const attachmentOptions = useMemo<DiscussionAttachmentOption[]>(() => {
    if (!selectedStock || !myState?.joined) return []
    const options: DiscussionAttachmentOption[] = []
    const longPosition = myState.positions.find((position) => position.stockId === selectedStock.id && position.quantity > 0)
    if (longPosition) {
      const returnPercent = longPosition.averagePrice > 0
        ? ((longPosition.currentPrice - longPosition.averagePrice) / longPosition.averagePrice) * 100
        : 0
      options.push({
        input: { type: 'long_position', referenceId: longPosition.id },
        label: '보유종목·수익률',
        detail: `${formatPrice(longPosition.quantity)}주 · ${formatPercent(returnPercent)}`,
      })
    }

    const shortPosition = myState.shortPositions.find((position) => position.stockId === selectedStock.id && position.quantity > 0)
    if (shortPosition) {
      options.push({
        input: { type: 'short_position', referenceId: shortPosition.id },
        label: '공매도 보유·수익률',
        detail: `${formatPrice(shortPosition.quantity)}주 · ${formatPercent(shortPosition.unrealizedReturn)}`,
      })
    }

    myState.orders
      .filter((order) => order.stockId === selectedStock.id && order.status === 'executed' && order.executionPrice)
      .sort((left, right) => Date.parse(right.executedAt ?? right.submittedAt) - Date.parse(left.executedAt ?? left.submittedAt))
      .slice(0, 10)
      .forEach((order) => {
        const sideLabel = { buy: '매수', sell: '매도', short: '공매도', cover: '공매도 청산' }[order.side]
        options.push({
          input: { type: 'execution', referenceId: order.id },
          label: `${sideLabel} 체결결과`,
          detail: `${formatPrice(order.executedQuantity ?? order.requestedQuantity)}주 · ${formatPrice(order.executionPrice ?? order.orderPrice)} RP`,
        })
      })

    return options
  }, [myState, selectedStock])

  useEffect(() => {
    const leagueId = market?.league?.id
    if (stockId || !leagueId) {
      setRecentPosts([])
      setRecentPostsLoading(false)
      setRecentPostsError(null)
      return undefined
    }

    let active = true
    setRecentPostsLoading(true)
    setRecentPostsError(null)
    void loadRecentDiscussionPosts(leagueId)
      .then((nextPosts) => {
        if (active) setRecentPosts(nextPosts)
      })
      .catch((error: unknown) => {
        if (active) setRecentPostsError(error instanceof Error ? error.message : '최신 게시글을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (active) setRecentPostsLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadRecentDiscussionPosts, market?.league?.id, stockId])

  useEffect(() => {
    if (!selectedStock?.id) {
      setPosts([])
      setPostsError(null)
      return undefined
    }

    let active = true
    setPostsLoading(true)
    setPostsError(null)
    void loadDiscussionPosts(selectedStock.id, postSort)
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
  }, [loadDiscussionPosts, postSort, selectedStock?.id])

  function closeComposer() {
    if (submitting) return
    setComposerOpen(false)
    setFormMessage(null)
  }

  async function handleFavorite(stock: StockSummary, favorited: boolean) {
    setFavoriteError(null)
    try {
      await setStockFavorite(stock.id, favorited)
    } catch (favoriteRequestError) {
      setFavoriteError(favoriteRequestError instanceof Error
        ? favoriteRequestError.message
        : '즐겨찾기를 변경하지 못했습니다.')
    }
  }

  async function handleLike(post: DiscussionPost) {
    if (!selectedStock || likingPostId) return
    setLikingPostId(post.id)
    try {
      const result = await setDiscussionPostLike(post.id, !post.likedByMe)
      setPosts((currentPosts) => {
        const nextPosts = currentPosts.map((currentPost) => currentPost.id === post.id
          ? { ...currentPost, likedByMe: result.liked, likeCount: result.likeCount }
          : currentPost)
        return postSort === 'likes'
          ? [...nextPosts].sort((left, right) => (
            right.likeCount - left.likeCount || Date.parse(right.createdAt) - Date.parse(left.createdAt)
          ))
          : nextPosts
      })
    } finally {
      setLikingPostId(null)
    }
  }

  async function handleComment(postId: string, commentContent: string) {
    const comment = await createDiscussionComment(postId, commentContent)
    setPosts((currentPosts) => currentPosts.map((post) => post.id === postId
      ? {
          ...post,
          commentCount: post.commentCount + 1,
          comments: [...post.comments, comment],
        }
      : post))
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
      await createDiscussionPost(selectedStock.id, normalizedTitle, normalizedContent, attachment)
      const nextPosts = await loadDiscussionPosts(selectedStock.id, postSort)
      setPosts(nextPosts)
      setTitle('')
      setContent('')
      setAttachment(null)
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

  if (!discussionStocks.length) {
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
          {favoriteError && <p className="page-error" role="alert">{favoriteError}</p>}
          <DiscussionFavoriteStocks stocks={favoriteStocks} />
          <DiscussionRecentFeed
            posts={recentPosts}
            stocks={discussionStocks}
            loading={recentPostsLoading}
            error={recentPostsError}
          />
          <DiscussionStockList
            stocks={discussionStocks}
            favoriteStockIds={favoriteStockIdSet}
            canFavorite={Boolean(myState?.joined)}
            onToggleFavorite={(stock, favorited) => void handleFavorite(stock, favorited)}
          />
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
            <div className="discussion-board-actions">
              <button
                className={`favorite-button${favoriteStockIdSet.has(selectedStock.id) ? ' is-active' : ''}`}
                type="button"
                aria-label={`${selectedStock.name} 즐겨찾기 ${favoriteStockIdSet.has(selectedStock.id) ? '해제' : '추가'}`}
                aria-pressed={favoriteStockIdSet.has(selectedStock.id)}
                disabled={!myState?.joined}
                onClick={() => void handleFavorite(selectedStock, !favoriteStockIdSet.has(selectedStock.id))}
              >
                <Star size={18} fill={favoriteStockIdSet.has(selectedStock.id) ? 'currentColor' : 'none'} />
              </button>
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
            </div>
          </header>

          {!myState?.joined && <LeagueJoinCard compact />}
          {favoriteError && <p className="page-error" role="alert">{favoriteError}</p>}
          {pageMessage && <p className="form-message discussion-page-message" role="status">{pageMessage}</p>}

          <div className="discussion-feed-toolbar" role="group" aria-label="게시글 정렬">
            <button
              className={postSort === 'latest' ? 'is-active' : undefined}
              type="button"
              aria-pressed={postSort === 'latest'}
              onClick={() => setPostSort('latest')}
            >
              최신순
            </button>
            <button
              className={postSort === 'likes' ? 'is-active' : undefined}
              type="button"
              aria-pressed={postSort === 'likes'}
              onClick={() => setPostSort('likes')}
            >
              좋아요순
            </button>
          </div>

          <section className="discussion-feed" aria-live="polite" aria-busy={postsLoading}>
            {postsError && <p className="page-error" role="alert">{postsError}</p>}
            {postsLoading ? (
              <div className="skeleton skeleton--chart" aria-label="게시글 불러오는 중" />
            ) : posts.length > 0 ? posts.map((post) => (
              <DiscussionPostCard
                key={post.id}
                post={post}
                canInteract={Boolean(myState?.joined)}
                liking={likingPostId !== null}
                onLike={handleLike}
                onComment={handleComment}
              />
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
              attachmentOptions={attachmentOptions}
              attachment={attachment}
              onTitleChange={setTitle}
              onContentChange={setContent}
              onAttachmentChange={setAttachment}
              onClose={closeComposer}
              onSubmit={(event) => void handleSubmit(event)}
            />
          )}
        </div>
      )}
    </div>
  )
}
