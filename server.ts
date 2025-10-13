/**
 * TanStack Start Production Server with Bun
 */

import path from 'node:path'

const SERVER_PORT = Number(process.env.PORT ?? 3000)
const CLIENT_DIRECTORY = './dist/client'
const SERVER_ENTRY_POINT = './dist/server/server.js'
const OPENCODE_SERVER_URL = process.env.VITE_OPENCODE_SERVER_URL || 'http://localhost:4096'

async function initializeServer() {
  console.log('[INFO] Starting TanStack Start server...')

  let handler: { fetch: (request: Request) => Response | Promise<Response> }
  try {
    const serverModule = (await import(SERVER_ENTRY_POINT)) as {
      default: { fetch: (request: Request) => Response | Promise<Response> }
    }
    handler = serverModule.default
    console.log('[SUCCESS] Server handler initialized')
  } catch (error) {
    console.error(`[ERROR] Failed to load server handler: ${String(error)}`)
    process.exit(1)
  }

  const server = Bun.serve({
    port: SERVER_PORT,
    fetch: async (req: Request) => {
      try {
        const url = new URL(req.url)
        const pathname = url.pathname
        
        if (pathname === '/api/events') {
          const directory = url.searchParams.get('directory')
          const eventUrl = new URL(`${OPENCODE_SERVER_URL}/event`)
          if (directory) {
            eventUrl.searchParams.set('directory', directory)
          }

          try {
            const response = await fetch(eventUrl.toString(), {
              headers: {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              },
            })

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
            console.error('[SSE Proxy] Error:', error)
            return new Response(JSON.stringify({ error: 'Failed to proxy event stream' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }
        
        if (pathname.startsWith('/public/') || pathname.startsWith('/assets/')) {
          const filePath = path.join(CLIENT_DIRECTORY, pathname)
          const file = Bun.file(filePath)
          if (await file.exists()) {
            return new Response(file)
          }
        }
        
        return handler.fetch(req)
      } catch (error) {
        console.error(`[ERROR] Request error: ${String(error)}`)
        return new Response('Internal Server Error', { status: 500 })
      }
    },
  })

  console.log(`[SUCCESS] Server listening on http://localhost:${String(server.port)}`)
}

initializeServer().catch((error: unknown) => {
  console.error(`[ERROR] Failed to start server: ${String(error)}`)
  process.exit(1)
})