/**
 * TanStack Start Production Server with Bun
 */

import path from 'node:path'

const NODE_ENV = process.env.NODE_ENV ?? 'production'
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = NODE_ENV
}
const IS_PRODUCTION = NODE_ENV === 'production'

const SERVER_PORT = Number(process.env.PORT ?? 3000)
const CLIENT_DIRECTORY = path.resolve(process.cwd(), 'dist/client')
const SERVER_ASSETS_DIRECTORY = path.resolve(process.cwd(), 'dist/server/assets')
const SERVER_ENTRY_POINT = new URL('./dist/server/server.js', import.meta.url)
const OPENCODE_SERVER_URL = process.env.VITE_OPENCODE_SERVER_URL || 'http://localhost:4096'

async function initializeServer() {
  if (!IS_PRODUCTION) console.log('[INFO] Starting TanStack Start server...')

  let handler: { fetch: (request: Request) => Response | Promise<Response> }
  try {
    const serverModule = (await import(SERVER_ENTRY_POINT.href)) as {
      default: { fetch: (request: Request) => Response | Promise<Response> }
    }
    handler = serverModule.default
    if (!IS_PRODUCTION) console.log('[SUCCESS] Server handler initialized')
  } catch (error) {
    console.error(`[ERROR] Failed to load server handler: ${String(error)}`)
    process.exit(1)
  }

  const server = Bun.serve({
    port: SERVER_PORT,
    idleTimeout: 0, // Disable idle timeout for SSE connections
    fetch: async (req: Request) => {
      try {
        const url = new URL(req.url)
        const pathname = url.pathname
        
        if (pathname === '/api/events') {
          const directory = url.searchParams.get('directory');
          const eventUrl = new URL(`${OPENCODE_SERVER_URL}/event`);
          if (directory) {
            eventUrl.searchParams.set('directory', directory);
          }

          try {
            const response = await fetch(eventUrl.toString(), {
              headers: {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              },
            });

            if (!response.ok) {
              return new Response(JSON.stringify({ error: 'Failed to connect to event stream' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
              })
            }

            return new Response(response.body, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
              },
            })
          } catch (error) {
            console.error('[SSE Proxy] Error:', error);
            return new Response(JSON.stringify({ error: 'Failed to proxy event stream' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }
        
        const staticResponse = await serveStatic(pathname)
        if (staticResponse) return staticResponse

        const response = await handler.fetch(req)
        return await toWebResponse(response)
      } catch (error) {
        console.error(`[ERROR] Request error: ${String(error)}`)
        return new Response('Internal Server Error', { status: 500 })
      }
    },
  })

  console.log(`[SUCCESS] Server listening on http://localhost:${String(server.port)}`)
}

function isImmutableAsset(relativePath: string) {
  return (
    relativePath.startsWith('assets/') ||
    relativePath.startsWith('_tanstack-start') ||
    relativePath.startsWith('index-') ||
    relativePath.startsWith('router-') ||
    relativePath.startsWith('start-') ||
    relativePath.startsWith('virtual_pwa-register') ||
    relativePath.startsWith('workbox-window') ||
    relativePath.endsWith('.webmanifest') ||
    relativePath.endsWith('.png') ||
    relativePath.endsWith('.svg') ||
    relativePath.endsWith('.ico')
  )
}

async function serveStatic(pathname: string): Promise<Response | null> {
  if (!pathname || pathname === '/') return null
  const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname
  if (!relativePath || relativePath.includes('..') || relativePath.includes('\0')) return null

  const candidates = [
    { root: CLIENT_DIRECTORY, path: relativePath },
    { root: SERVER_ASSETS_DIRECTORY, path: relativePath },
  ]

  for (const candidate of candidates) {
    const absolutePath = path.resolve(candidate.root, candidate.path)
    if (!absolutePath.startsWith(candidate.root)) continue
    const file = Bun.file(absolutePath)
    if (await file.exists()) {
      const headers = new Headers()
      headers.set('Content-Type', file.type || 'application/octet-stream')
      if (isImmutableAsset(relativePath)) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      }
      return new Response(file.stream(), { headers })
    }
  }

  return null
}

async function toWebResponse(maybeResponse: unknown): Promise<Response> {
  if (maybeResponse instanceof Response && maybeResponse.constructor?.name === 'Response') {
    return maybeResponse
  }

  if (!maybeResponse || typeof maybeResponse !== 'object') {
    console.error('[ERROR] Handler returned invalid response value:', typeof maybeResponse)
    return new Response('Internal Server Error', { status: 500 })
  }

  type CandidateHeaders =
    | Headers
    | Map<string, unknown>
    | Iterable<[string, unknown]>
    | Record<string, unknown>

  type CandidateResponse = {
    body?: unknown
    headers?: CandidateHeaders
    status?: number
    statusText?: string
    arrayBuffer?: () => Promise<ArrayBuffer>
    bytes?: () => Promise<ArrayBuffer | ArrayBufferView>
    text?: () => Promise<string>
  }

  type SharedArrayBufferLike = ArrayBufferLike & { readonly byteLength: number }

  const appendHeaders = (target: Headers, source?: CandidateHeaders) => {
    if (!source) return

    if (source instanceof Headers) {
      source.forEach((value, key) => target.set(key, value))
      return
    }

    if (source instanceof Map) {
      source.forEach((value, key) => target.set(key, String(value)))
      return
    }

    if (typeof (source as Iterable<unknown>)[Symbol.iterator] === 'function' && !(source instanceof Map)) {
      for (const entry of source as Iterable<[string, unknown]>) {
        const [key, value] = entry
        target.set(key, String(value))
      }
      return
    }

    for (const [key, value] of Object.entries(source)) {
      target.set(key, String(value))
    }
  }

  const isBodyInit = (value: unknown): value is BodyInit => {
    if (value == null) return false

    if (typeof value === 'string') return true

    if (value instanceof Blob || value instanceof FormData || value instanceof URLSearchParams) {
      return true
    }

    if (value instanceof ReadableStream) {
      return true
    }

    if (isSharedArrayBuffer(value)) {
      return false
    }

    if (value instanceof ArrayBuffer) {
      return true
    }

    if (ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView
      if (isSharedArrayBuffer(view.buffer)) {
        return false
      }
      return true
    }

    return false
  }

  const isSharedArrayBuffer = (value: unknown): value is SharedArrayBufferLike => {
    return Object.prototype.toString.call(value) === '[object SharedArrayBuffer]'
  }

  const cloneBufferView = (view: ArrayBufferView): ArrayBuffer => {
    const copy = new Uint8Array(view.byteLength)
    copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
    return copy.buffer
  }

  const cloneSharedBuffer = (buffer: SharedArrayBufferLike): ArrayBuffer => {
    const view = new Uint8Array(buffer)
    const copy = new Uint8Array(view.length)
    copy.set(view)
    return copy.buffer
  }

  const candidate = maybeResponse as CandidateResponse

  const headers = new Headers()
  appendHeaders(headers, candidate.headers)

  const init: ResponseInit = {
    status: typeof candidate.status === 'number' ? candidate.status : 200,
    statusText: typeof candidate.statusText === 'string' ? candidate.statusText : 'OK',
    headers,
  }

  if (isBodyInit(candidate.body)) {
    return new Response(candidate.body, init)
  }

  if (isSharedArrayBuffer(candidate.body)) {
    return new Response(cloneSharedBuffer(candidate.body), init)
  }

  if (candidate.body && ArrayBuffer.isView(candidate.body)) {
    const view = candidate.body as ArrayBufferView
    return new Response(cloneBufferView(view), init)
  }

  if (typeof candidate.arrayBuffer === 'function') {
    const buffer = await candidate.arrayBuffer()
    return new Response(buffer, init)
  }

  if (typeof candidate.bytes === 'function') {
    const buffer = await candidate.bytes()
    if (isBodyInit(buffer)) {
      return new Response(buffer, init)
    }
    if (ArrayBuffer.isView(buffer)) {
      const view = buffer as ArrayBufferView
      return new Response(cloneBufferView(view), init)
    }
    if (isSharedArrayBuffer(buffer)) {
      return new Response(cloneSharedBuffer(buffer), init)
    }
  }

  if (typeof candidate.text === 'function') {
    const text = await candidate.text()
    return new Response(text, init)
  }

  console.error('[ERROR] Unable to normalize handler response, returning empty payload.')
  return new Response(null, init)
}

initializeServer().catch((error: unknown) => {
  console.error(`[ERROR] Failed to start server: ${String(error)}`)
  process.exit(1)
})
