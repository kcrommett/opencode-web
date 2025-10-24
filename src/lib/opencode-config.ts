export function normalizeBaseUrl(url: string): string {
  const normalized = url.replace(/\/+$/, "");
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    throw new Error(`Invalid URL protocol: ${normalized}`);
  }
  return normalized;
}

export function getOpencodeServerUrl(): string {
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    const config = (
      window as typeof window & { __OPENCODE_CONFIG__?: { serverUrl: string } }
    ).__OPENCODE_CONFIG__;
    if (config?.serverUrl) {
      return normalizeBaseUrl(config.serverUrl);
    }
  }

  const url =
    process.env.OPENCODE_SERVER_URL ||
    process.env.VITE_OPENCODE_SERVER_URL ||
    (globalThis as typeof globalThis & { __OPENCODE_SERVER_URL__?: string })
      .__OPENCODE_SERVER_URL__ ||
    "http://localhost:4096";

  if (process.env.NODE_ENV !== "production") {
    console.log("[opencode-config] getOpencodeServerUrl() resolved:", url);
    console.log("[opencode-config] Environment variables:", {
      OPENCODE_SERVER_URL: process.env.OPENCODE_SERVER_URL,
      VITE_OPENCODE_SERVER_URL: process.env.VITE_OPENCODE_SERVER_URL,
      isBrowser,
    });
  }

  return normalizeBaseUrl(url);
}

export function getClientOpencodeConfig(): { serverUrl: string } {
  const url =
    process.env.OPENCODE_SERVER_URL ||
    process.env.VITE_OPENCODE_SERVER_URL ||
    (globalThis as typeof globalThis & { __OPENCODE_SERVER_URL__?: string })
      .__OPENCODE_SERVER_URL__ ||
    "http://localhost:4096";
  return { serverUrl: normalizeBaseUrl(url) };
}
