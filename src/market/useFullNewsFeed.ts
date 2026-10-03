import { useCallback, useEffect, useState } from 'react'
import { useMarket } from './useMarket'

// News pages list every edition, so they request the full feed that the market refresh skips.
export function useFullNewsFeed(enabled = true) {
  const { newsFeedComplete, loadFullNewsFeed } = useMarket()
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    loadFullNewsFeed().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : '뉴스를 불러오지 못했습니다.')
    })
  }, [loadFullNewsFeed])

  useEffect(() => {
    if (enabled) load()
  }, [enabled, load])

  return { ready: newsFeedComplete, error, retry: load }
}
