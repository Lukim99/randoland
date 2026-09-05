import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { dangerouslyDeleteByTag } from '@vercel/functions'

const publicBuckets = new Map([
  ['randoland-stock-logos', 'stock'],
  ['randoland-profile-images', 'profile'],
])
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const maxImageBytes = 1024 * 1024

function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (!['GET', 'HEAD', 'DELETE'].includes(request.method)) {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD, DELETE', 'Cache-Control': 'no-store' } })
    }

    const params = new URL(request.url).searchParams
    const bucket = params.get('bucket') ?? ''
    const path = params.get('path') ?? ''
    const prefix = publicBuckets.get(bucket)
    // Never proxy arbitrary URLs, Wiki assets, or private discussion images.
    if (!prefix || !new RegExp(`^${uuid}/${prefix}-${uuid}\\.(png|jpg|webp)$`).test(path)
      || params.getAll('bucket').length !== 1 || params.getAll('path').length !== 1
      || [...params.keys()].some((key) => key !== 'bucket' && key !== 'path')) {
      return errorResponse(400, '이미지 경로가 올바르지 않습니다.')
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    if (!supabaseUrl) return errorResponse(503, '이미지 서버 연결 정보가 없습니다.')
    const cacheTag = `public-image-${createHash('sha256').update(`${bucket}/${path}`).digest('hex')}`

    try {
      if (request.method === 'DELETE') {
        const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
        if (!token) return errorResponse(401, '로그인이 필요합니다.')
        const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
        if (!key) return errorResponse(503, '이미지 서버 연결 정보가 없습니다.')
        const client = createClient(supabaseUrl, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
        const { data: { user }, error: authError } = await client.auth.getUser(token)
        if (authError || !user) return errorResponse(401, '로그인을 다시 확인해 주세요.')
        if (path.split('/')[0] !== user.id) return errorResponse(403, '본인의 이미지만 삭제할 수 있습니다.')

        // Use the caller's JWT so existing ownership and unreferenced-stock RLS still apply.
        const { error } = await client.storage.from(bucket).remove([path])
        if (error) return errorResponse(403, '이미지를 삭제할 수 없습니다.')
        await dangerouslyDeleteByTag(cacheTag)
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
      }

      const source = new URL(`/storage/v1/object/public/${bucket}/${path}`, supabaseUrl)
      const upstream = await fetch(source, {
        method: request.method,
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      })
      if (!upstream.ok) {
        await upstream.body?.cancel()
        return errorResponse(upstream.status === 400 || upstream.status === 404 ? 404 : 502, '이미지를 불러올 수 없습니다.')
      }

      const type = upstream.headers.get('content-type')?.split(';')[0] ?? ''
      if (!imageTypes.has(type) || Number(upstream.headers.get('content-length')) > maxImageBytes) {
        await upstream.body?.cancel()
        return errorResponse(502, '이미지 형식이나 용량이 올바르지 않습니다.')
      }
      const body = request.method === 'HEAD' ? null : await upstream.arrayBuffer()
      if (body && body.byteLength > maxImageBytes) return errorResponse(502, '이미지 용량이 올바르지 않습니다.')

      // Copy only image headers, never the upstream cookies that prevent CDN caching.
      const headers = new Headers({
        'Content-Type': type,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
        'Vercel-Cache-Tag': cacheTag,
      })
      for (const name of ['etag', 'last-modified', 'content-length']) {
        const value = upstream.headers.get(name)
        if (value) headers.set(name, value)
      }
      return new Response(body, { headers })
    } catch {
      return errorResponse(502, '이미지 요청을 처리하지 못했습니다. 다시 시도해 주세요.')
    }
  },
}
