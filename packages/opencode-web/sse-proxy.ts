/**
 * SSE Proxy Helper
 * 
 * Validates upstream SSE responses and returns structured errors when
 * the upstream returns non-SSE content (e.g., HTML auth pages, error pages).
 */

/**
 * Error envelope returned when upstream doesn't provide SSE response
 */
export interface SseProxyError {
  status: number;
  upstreamUrl: string;
  contentType: string | null;
  bodySnippet: string;
  timestamp: string;
}

interface SseProxyOptions {
  /** Maximum bytes to read from non-SSE response for diagnostic snippet */
  maxSnippetBytes?: number;
  /** Whether to log errors (should be disabled in production) */
  enableLogging?: boolean;
}

const DEFAULT_OPTIONS: Required<SseProxyOptions> = {
  maxSnippetBytes: 2048,
  enableLogging: process.env.NODE_ENV !== "production",
};

/**
 * Check if content-type header indicates SSE response
 */
function isEventStream(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("text/event-stream");
}

/**
 * Read a limited snippet from response body for diagnostics
 */
async function readBodySnippet(response: Response, maxBytes: number): Promise<string> {
  try {
    const reader = response.body?.getReader();
    if (!reader) return "";

    let result = "";
    let bytesRead = 0;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const remaining = maxBytes - bytesRead;
      result += chunk.slice(0, remaining);
      bytesRead += value.byteLength;
    }

    // Cancel remaining stream to avoid memory issues
    await reader.cancel().catch(() => {});

    return result;
  } catch {
    return "";
  }
}

/**
 * Create JSON error response with SSE proxy error envelope
 */
function createErrorResponse(error: SseProxyError, status: number): Response {
  return new Response(
    JSON.stringify({ error }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Proxy SSE request to upstream server with content-type validation
 * 
 * @param upstreamUrl - Full URL to the upstream SSE endpoint
 * @param options - Configuration options
 * @returns Response - Either SSE stream or JSON error envelope
 */
export async function proxySseRequest(
  upstreamUrl: string,
  options?: SseProxyOptions
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const log = opts.enableLogging
    ? (...args: unknown[]) => console.log("[SSE Proxy]", ...args)
    : () => {};
  const logError = opts.enableLogging
    ? (...args: unknown[]) => console.error("[SSE Proxy]", ...args)
    : () => {};

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    const contentType = response.headers.get("content-type");

    // Check if upstream returned SSE
    if (response.ok && isEventStream(contentType)) {
      log(`Connected to upstream: ${upstreamUrl}`);
      
      // Stream the SSE response with proper headers
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Non-SSE response - read snippet for diagnostics
    const bodySnippet = await readBodySnippet(response, opts.maxSnippetBytes);
    
    const error: SseProxyError = {
      status: response.status,
      upstreamUrl,
      contentType,
      bodySnippet,
      timestamp: new Date().toISOString(),
    };

    if (response.ok) {
      // 200 but wrong content-type (HTML auth page, etc.)
      logError(
        `Upstream returned ${response.status} with wrong content-type: ${contentType}`,
        `\nBody snippet: ${bodySnippet.slice(0, 200)}...`
      );
    } else {
      // Non-2xx status
      logError(
        `Upstream returned ${response.status}: ${contentType}`,
        `\nBody snippet: ${bodySnippet.slice(0, 200)}...`
      );
    }

    return createErrorResponse(error, response.status || 502);
  } catch (err) {
    // Network/connection error
    logError("Failed to connect to upstream:", err);

    const error: SseProxyError = {
      status: 502,
      upstreamUrl,
      contentType: null,
      bodySnippet: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    };

    return createErrorResponse(error, 502);
  }
}

/**
 * Build upstream event URL from server URL and optional directory
 */
export function buildEventUrl(serverUrl: string, directory?: string | null): string {
  const eventUrl = new URL("/event", serverUrl);
  if (directory) {
    eventUrl.searchParams.set("directory", directory);
  }
  return eventUrl.toString();
}
