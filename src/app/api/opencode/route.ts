import { openCodeServerService as openCodeService, handleOpencodeServerError as handleOpencodeError } from "@/lib/opencode-server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { action, sessionId, content } = await request.json()

    switch (action) {
      case "create_session":
        const session = await openCodeService.createSession()
        return NextResponse.json(session)

      case "send_message":
        if (!sessionId) {
          return NextResponse.json({ error: "Session ID required" }, { status: 400 })
        }
        await openCodeService.sendMessage(sessionId, content)
        return NextResponse.json({ success: true })

      case "get_messages":
        if (!sessionId) {
          return NextResponse.json({ error: "Session ID required" }, { status: 400 })
        }
        const messages = await openCodeService.getMessages(sessionId)
        return NextResponse.json(messages)

      case "get_sessions":
        const sessions = await openCodeService.getSessions()
        return NextResponse.json(sessions)

       case "test_connection":
         const app = await openCodeService.getAgents()
         return NextResponse.json({ connected: true, app })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("OpenCode API error:", error)
    const errorMessage = handleOpencodeError(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

 export async function GET() {
   try {
     const app = await openCodeService.getAgents()
     return NextResponse.json({ connected: true, app })
   } catch (error) {
     console.error("OpenCode connection test failed:", error)
     const errorMessage = handleOpencodeError(error)
     return NextResponse.json({ connected: false, error: errorMessage }, { status: 500 })
   }
 }