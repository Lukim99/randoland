import assert from 'node:assert/strict'
import { after, beforeEach, mock, test } from 'node:test'

const purges = []
mock.module('@vercel/functions', { namedExports: {
  dangerouslyDeleteByTag: async (tag) => { purges.push(tag) },
} })
const { default: handler } = await import('../api/public-image.ts')
const owner = '11111111-1111-4111-8111-111111111111'
const otherOwner = '22222222-2222-4222-8222-222222222222'
const imageId = '33333333-3333-4333-8333-333333333333'
const path = `${owner}/stock-${imageId}.png`
const endpoint = (params = { bucket: 'randoland-stock-logos', path }) =>
  `https://randoland.example/api/public-image?${new URLSearchParams(params)}`
const originalFetch = globalThis.fetch
const originalUrl = process.env.VITE_SUPABASE_URL
const originalKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
let requests
let respond

beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key'
  requests = []
  purges.length = 0
  respond = () => new Response(new Uint8Array([1, 2, 3]), { headers: {
    'Content-Type': 'image/png', 'Content-Length': '3', 'ETag': 'test-image', 'Set-Cookie': 'upstream-cookie=value',
  } })
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), ...options })
    return respond(String(url), options)
  }
})

after(() => {
  globalThis.fetch = originalFetch
  if (originalUrl === undefined) delete process.env.VITE_SUPABASE_URL
  else process.env.VITE_SUPABASE_URL = originalUrl
  if (originalKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = originalKey
})

test('public image is cached without forwarding cookies or caller credentials', async () => {
  const response = await handler.fetch(new Request(endpoint(), { headers: { Authorization: 'Bearer private-token', Cookie: 'private-cookie=1' } }))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('set-cookie'), null)
  assert.equal(response.headers.get('etag'), 'test-image')
  assert.match(response.headers.get('vercel-cdn-cache-control'), /max-age=31536000/)
  assert.match(response.headers.get('vercel-cache-tag'), /^public-image-[0-9a-f]{64}$/)
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3])
  assert.equal(requests[0].url, `https://example.supabase.co/storage/v1/object/public/randoland-stock-logos/${path}`)
  assert.equal(requests[0].headers, undefined)
})

test('new image paths immediately use a different source and cache tag', async () => {
  const first = await handler.fetch(new Request(endpoint()))
  const second = await handler.fetch(new Request(endpoint({ bucket: 'randoland-stock-logos', path: path.replace(imageId, otherOwner) })))
  assert.notEqual(first.headers.get('vercel-cache-tag'), second.headers.get('vercel-cache-tag'))
  assert.notEqual(requests[0].url, requests[1].url)
})

test('private buckets, foreign URLs, traversal, duplicates and cache-busting parameters never reach the origin', async () => {
  const urls = [
    endpoint({ bucket: 'randoland-discussion-images', path }),
    endpoint({ bucket: 'wiki-images', path }),
    endpoint({ bucket: 'randoland-stock-logos', path: 'https://attacker.invalid/image.png' }),
    endpoint({ bucket: 'randoland-stock-logos', path: `${owner}/../image.png` }),
    endpoint({ bucket: 'randoland-profile-images', path }),
    endpoint() + '&path=another', endpoint() + '&nonce=1',
  ]
  for (const url of urls) {
    const response = await handler.fetch(new Request(url))
    assert.equal(response.status, 400)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  assert.equal(requests.length, 0)
})

test('HEAD returns metadata without downloading a body', async () => {
  respond = () => new Response(null, { headers: { 'Content-Type': 'image/png', 'Content-Length': '3' } })
  const response = await handler.fetch(new Request(endpoint(), { method: 'HEAD' }))
  assert.equal(response.status, 200)
  assert.equal(requests[0].method, 'HEAD')
  assert.equal((await response.arrayBuffer()).byteLength, 0)
})

test('missing images and origin outages are never cached', async () => {
  for (const status of [400, 404, 500]) {
    respond = () => new Response('origin error', { status })
    const response = await handler.fetch(new Request(endpoint()))
    assert.equal(response.status, status === 500 ? 502 : 404)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('invalid image bodies, oversized files and network failures are rejected', async () => {
  for (const next of [
    () => new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } }),
    () => new Response('large', { headers: { 'Content-Type': 'image/png', 'Content-Length': String(2 * 1024 * 1024) } }),
    () => new Response(new Uint8Array(1024 * 1024 + 1), { headers: { 'Content-Type': 'image/png' } }),
    () => { throw new Error('network down') },
  ]) {
    respond = next
    const response = await handler.fetch(new Request(endpoint()))
    assert.equal(response.status, 502)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('unsupported methods and missing configuration fail without an origin request', async () => {
  assert.equal((await handler.fetch(new Request(endpoint(), { method: 'POST' }))).status, 405)
  delete process.env.VITE_SUPABASE_URL
  assert.equal((await handler.fetch(new Request(endpoint()))).status, 503)
  assert.equal(requests.length, 0)
})

test('deletion requires a valid signed-in owner', async () => {
  assert.equal((await handler.fetch(new Request(endpoint(), { method: 'DELETE' }))).status, 401)
  assert.equal(requests.length, 0)
  respond = () => Response.json({ message: 'invalid JWT' }, { status: 401 })
  assert.equal((await handler.fetch(new Request(endpoint(), { method: 'DELETE', headers: { Authorization: 'Bearer invalid' } }))).status, 401)
  respond = () => Response.json({ id: otherOwner })
  assert.equal((await handler.fetch(new Request(endpoint(), { method: 'DELETE', headers: { Authorization: 'Bearer other-user' } }))).status, 403)
  assert.equal(requests.filter((request) => request.method === 'DELETE').length, 0)
  assert.equal(purges.length, 0)
})

test('storage RLS denial prevents cache deletion', async () => {
  respond = (url) => url.includes('/auth/v1/user')
    ? Response.json({ id: owner })
    : Response.json({ message: 'RLS denied', statusCode: '403' }, { status: 403 })
  const response = await handler.fetch(new Request(endpoint(), { method: 'DELETE', headers: { Authorization: 'Bearer owner-token' } }))
  assert.equal(response.status, 403)
  assert.equal(purges.length, 0)
})

test('authorized deletion forwards the owner JWT and purges only the image tag, including retries', async () => {
  const imageResponse = await handler.fetch(new Request(endpoint()))
  respond = (url) => url.includes('/auth/v1/user') ? Response.json({ id: owner }) : Response.json([])
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await handler.fetch(new Request(endpoint(), { method: 'DELETE', headers: { Authorization: 'Bearer owner-token' } }))
    assert.equal(response.status, 204)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  assert.deepEqual(purges, Array(2).fill(imageResponse.headers.get('vercel-cache-tag')))
  const removal = requests.find((request) => request.method === 'DELETE')
  assert.equal(new Headers(removal.headers).get('authorization'), 'Bearer owner-token')
  assert.deepEqual(JSON.parse(removal.body), { prefixes: [path] })
})
