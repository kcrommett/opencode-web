export function normalizeBaseUrl(url: string): string {
  const normalized = url.replace(/\/+$/, "");
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    throw new Error(`Invalid URL protocol: ${normalized}`);
  }
  return normalized;
}

export function getOpencodeServerUrl(): string {
  const url =
    process.env.OPENCODE_SERVER_URL ||
    process.env.VITE_OPENCODE_SERVER_URL ||
    (globalThis as typeof globalThis & { __OPENCODE_SERVER_URL__?: string })
      .__OPENCODE_SERVER_URL__ ||
    "http://localhost:4096";
  return normalizeBaseUrl(url);
}

export function getClientOpencodeConfig(): { serverUrl: string } {
  const url =
    process.env.VITE_OPENCODE_SERVER_URL ||
    (globalThis as typeof globalThis & { __OPENCODE_SERVER_URL__?: string })
      .__OPENCODE_SERVER_URL__ ||
    "http://localhost:4096";
  return { serverUrl: normalizeBaseUrl(url) };
}
