import { describe, expect, test, mock, beforeEach } from "bun:test";
import { proxySseRequest, buildEventUrl, type SseProxyError } from "./sse-proxy";

describe("sse-proxy", () => {
  describe("buildEventUrl", () => {
    test("should build URL without directory", () => {
      const result = buildEventUrl("http://localhost:4096");
      expect(result).toBe("http://localhost:4096/event");
    });

    test("should build URL with directory", () => {
      const result = buildEventUrl("http://localhost:4096", "/my/project");
      expect(result).toBe("http://localhost:4096/event?directory=%2Fmy%2Fproject");
    });

    test("should handle null directory", () => {
      const result = buildEventUrl("http://localhost:4096", null);
      expect(result).toBe("http://localhost:4096/event");
    });

    test("should handle trailing slash in server URL", () => {
      const result = buildEventUrl("http://localhost:4096/");
      expect(result).toBe("http://localhost:4096/event");
    });
  });

  describe("proxySseRequest", () => {
    const originalFetch = globalThis.fetch;
    
    beforeEach(() => {
      globalThis.fetch = originalFetch;
    });

    test("should return SSE response when upstream returns event-stream", async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: test\n\n"));
          controller.close();
        },
      });

      globalThis.fetch = mock(async () => {
        return new Response(mockBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      });

      const result = await proxySseRequest("http://localhost:4096/event", {
        enableLogging: false,
      });

      expect(result.status).toBe(200);
      expect(result.headers.get("Content-Type")).toBe("text/event-stream");
      expect(result.headers.get("Cache-Control")).toBe("no-cache, no-transform");
      expect(result.headers.get("Connection")).toBe("keep-alive");
      expect(result.headers.get("X-Accel-Buffering")).toBe("no");
    });

    test("should return JSON error when upstream returns HTML", async () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Login Required</title></head>
<body><h1>Please log in</h1></body>
</html>`;

      globalThis.fetch = mock(async () => {
        return new Response(htmlContent, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      });

      const result = await proxySseRequest("http://localhost:4096/event", {
        enableLogging: false,
      });

      expect(result.status).toBe(200);
      expect(result.headers.get("Content-Type")).toBe("application/json");

      const body = await result.json() as { error: SseProxyError };
      expect(body.error).toBeDefined();
      expect(body.error.status).toBe(200);
      expect(body.error.contentType).toBe("text/html");
      expect(body.error.bodySnippet).toContain("Login Required");
      expect(body.error.upstreamUrl).toBe("http://localhost:4096/event");
      expect(body.error.timestamp).toBeDefined();
    });

    test("should return JSON error when upstream returns 401", async () => {
      globalThis.fetch = mock(async () => {
        return new Response("Unauthorized", {
          status: 401,
          headers: { "Content-Type": "text/plain" },
        });
      });

      const result = await proxySseRequest("http://localhost:4096/event", {
        enableLogging: false,
      });

      expect(result.status).toBe(401);
      expect(result.headers.get("Content-Type")).toBe("application/json");

      const body = await result.json() as { error: SseProxyError };
      expect(body.error.status).toBe(401);
      expect(body.error.contentType).toBe("text/plain");
      expect(body.error.bodySnippet).toBe("Unauthorized");
    });

    test("should return 502 error on network failure", async () => {
      globalThis.fetch = mock(async () => {
        throw new Error("Connection refused");
      });

      const result = await proxySseRequest("http://localhost:4096/event", {
        enableLogging: false,
      });

      expect(result.status).toBe(502);
      expect(result.headers.get("Content-Type")).toBe("application/json");

      const body = await result.json() as { error: SseProxyError };
      expect(body.error.status).toBe(502);
      expect(body.error.contentType).toBeNull();
      expect(body.error.bodySnippet).toContain("Connection refused");
    });

    test("should truncate large body snippets", async () => {
      const largeHtml = "x".repeat(5000);

      globalThis.fetch = mock(async () => {
        return new Response(largeHtml, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      });

      const result = await proxySseRequest("http://localhost:4096/event", {
        enableLogging: false,
        maxSnippetBytes: 100,
      });

      const body = await result.json() as { error: SseProxyError };
      expect(body.error.bodySnippet.length).toBeLessThanOrEqual(100);
    });

    test("should handle event-stream with charset parameter", async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: test\n\n"));
          controller.close();
        },
      });

      globalThis.fetch = mock(async () => {
        return new Response(mockBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream; charset=utf-8" },
        });
      });

      const result = await proxySseRequest("http://localhost:4096/event", {
        enableLogging: false,
      });

      expect(result.status).toBe(200);
      expect(result.headers.get("Content-Type")).toBe("text/event-stream");
    });

    test("should send correct request headers", async () => {
      let capturedHeaders: Headers | undefined;

      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response(null, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      });

      await proxySseRequest("http://localhost:4096/event", {
        enableLogging: false,
      });

      expect(capturedHeaders?.get("Accept")).toBe("text/event-stream");
      expect(capturedHeaders?.get("Cache-Control")).toBe("no-cache");
      expect(capturedHeaders?.get("Connection")).toBe("keep-alive");
    });
  });
});
