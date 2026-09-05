import { supabase } from './supabase'

type PublicImageBucket = 'randoland-stock-logos' | 'randoland-profile-images'

export function getPublicImageUrl(bucket: PublicImageBucket, path: string) {
  if (import.meta.env.DEV && supabase) {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }
  return `/api/public-image?${new URLSearchParams({ bucket, path })}`
}

// Cleanup must not turn an already-saved profile/stock update into a failed update.
export async function removePublicImage(bucket: PublicImageBucket, path: string) {
  if (!supabase) return { error: new Error('Supabase 연결 정보가 설정되지 않았습니다.') }
  if (import.meta.env.DEV) return supabase.storage.from(bucket).remove([path])
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) return { error: error ?? new Error('로그인이 필요합니다.') }
    const response = await fetch(getPublicImageUrl(bucket, path), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    return { error: response.ok ? null : new Error('이미지와 캐시를 정리하지 못했습니다.') }
  } catch {
    return { error: new Error('이미지와 캐시를 정리하지 못했습니다.') }
  }
}
