import { NextRequest, NextResponse } from "next/server";

const OPENCODE_SERVER_URL = process.env.OPENCODE_SERVER_URL || "http://localhost:4096";

const ALLOWED_PATHS = [
  "/session",
  "/app",
  "/agent",
  "/project",
  "/config",
  "/file",
  "/find",
  "/tool",
  "/command",
  "/auth",
  "/event",
  "/path",
  "/tui",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, "DELETE");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, "PATCH");
}

async function handleRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
) {
  try {
    const { path } = await params;
    const requestPath = `/${path.join("/")}`;

    console.log(`[Proxy] ${method} ${requestPath}`);

    if (!ALLOWED_PATHS.some((p) => requestPath.startsWith(p))) {
      console.error(`[Proxy] Forbidden path: ${requestPath}`);
      return new NextResponse("Forbidden", { status: 403 });
    }

    const url = new URL(request.url);
    const targetUrl = `${OPENCODE_SERVER_URL}${requestPath}${url.search}`;

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (
        !key.toLowerCase().startsWith("host") &&
        !key.toLowerCase().startsWith("connection")
      ) {
        headers.set(key, value);
      }
    });

    let body: BodyInit | null = null;
    if (method !== "GET" && method !== "HEAD") {
      const contentType = request.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json = await request.json();
        body = JSON.stringify(json);
      } else if (contentType?.includes("text/")) {
        body = await request.text();
      } else {
        body = await request.blob();
      }
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const responseContentType = response.headers.get("content-type");

    if (responseContentType?.includes("text/event-stream")) {
      const stream = response.body;
      if (!stream) {
        return new NextResponse("No stream available", { status: 500 });
      }

      return new NextResponse(stream, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const responseBody = await response.text();
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Proxy request failed", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}