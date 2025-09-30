/**
 * TanStack Start Production Server with Bun
 */

import path from 'node:path'

const SERVER_PORT = Number(process.env.PORT ?? 3000)
const CLIENT_DIRECTORY = './dist/client'
const SERVER_ENTRY_POINT = './dist/server/server.js'

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
        const pathname = new URL(req.url).pathname
        
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