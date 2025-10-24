export function normalizeBaseUrl(url: string): string {
  const normalized = url.replace(/\/+$/, "");
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    throw new Error(`Invalid URL protocol: ${normalized}`);
  }
  return normalized;
}

function resolveServerUrlFromEnv(): string {
  const processEnv =
    typeof process !== "undefined" ? process.env : undefined;
  const importMetaEnv =
    typeof import.meta !== "undefined"
      ? ((import.meta as ImportMeta & {
          env?: Record<string, string | undefined>;
        }).env ?? undefined)
      : undefined;
  const globalRuntimeUrl = (
    globalThis as typeof globalThis & { __OPENCODE_SERVER_URL__?: string }
  ).__OPENCODE_SERVER_URL__;

  const url =
    processEnv?.OPENCODE_SERVER_URL ||
    processEnv?.VITE_OPENCODE_SERVER_URL ||
    importMetaEnv?.VITE_OPENCODE_SERVER_URL ||
    globalRuntimeUrl ||
    "http://localhost:4096";

  return normalizeBaseUrl(url);
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

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[opencode-config] getOpencodeServerUrl() resolved:",
      resolveServerUrlFromEnv(),
    );
    console.log("[opencode-config] Environment variables:", {
      OPENCODE_SERVER_URL: process.env.OPENCODE_SERVER_URL,
      VITE_OPENCODE_SERVER_URL: process.env.VITE_OPENCODE_SERVER_URL,
      isBrowser,
    });
  }

  return resolveServerUrlFromEnv();
}

export function getClientOpencodeConfig(): { serverUrl: string } {
  return { serverUrl: resolveServerUrlFromEnv() };
}
