import { supabase } from '../lib/supabase'

export const DISCUSSION_IMAGE_BUCKET = 'randoland-discussion-images'
const URL_LIFETIME_SECONDS = 60 * 60
const URL_REFRESH_MARGIN_MS = 60 * 1000

function createCache(accessToken: string | null) {
  return {
    accessToken,
    urls: new Map<string, { url: string; expiresAt: number }>(),
    pending: new Map<string, Promise<void>>(),
  }
}

let cache = createCache(null)

export function forgetDiscussionImage(path: string) {
  cache.urls.delete(path)
}

export async function loadDiscussionImageUrls(imagePaths: Array<string | null>) {
  const paths = [...new Set(imagePaths.filter((path): path is string => Boolean(path)))]
  const result = new Map<string, string>()
  if (paths.length === 0) return result
  if (!supabase) throw new Error('Supabase 연결 정보가 설정되지 않았습니다.')

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  // Private image URLs stay in memory and are never reused by another auth session.
  const accessToken = session?.access_token ?? null
  if (cache.accessToken !== accessToken) cache = createCache(accessToken)
  if (!session) return result
  const currentCache = cache
  const now = Date.now()
  for (const [path, entry] of currentCache.urls) {
    if (entry.expiresAt <= now + URL_REFRESH_MARGIN_MS) currentCache.urls.delete(path)
  }

  const missing = paths.filter((path) => !currentCache.urls.has(path) && !currentCache.pending.has(path))
  if (missing.length > 0) {
    const request = supabase.storage.from(DISCUSSION_IMAGE_BUCKET)
      .createSignedUrls(missing, URL_LIFETIME_SECONDS)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message)
        for (const image of data) {
          if (image.path && image.signedUrl && !image.error) {
            currentCache.urls.set(image.path, {
              url: image.signedUrl,
              expiresAt: now + URL_LIFETIME_SECONDS * 1000,
            })
          }
        }
      })
      .finally(() => {
        for (const path of missing) currentCache.pending.delete(path)
      })
    for (const path of missing) currentCache.pending.set(path, request)
  }

  await Promise.all(new Set(paths.map((path) => currentCache.pending.get(path))))
  for (const path of paths) {
    const entry = currentCache.urls.get(path)
    if (entry) result.set(path, entry.url)
  }
  return result
}
