/**
 * Configuration types and utilities for OpenCode Web
 * Implements canonical env vars: OPENCODE_SERVER_URL, OPENCODE_WEB_HOST, OPENCODE_WEB_PORT
 */

export interface WebConfig {
  webHost: string;
  webPort: number;
  serverUrl: string;
  metadata: {
    hostSource: string;
    portSource: string;
    serverUrlSource: string;
    usedLegacy: boolean;
  };
}

interface ConfigInput {
  env?: Record<string, string | undefined>;
  cliOverrides?: {
    host?: string;
    port?: number;
    serverUrl?: string;
  };
}

const DEFAULT_WEB_HOST = "localhost";
const DEFAULT_WEB_PORT = 3000;
const DEFAULT_SERVER_URL = "http://localhost:4096";

const isDev = () =>
  typeof process !== "undefined" &&
  process.env.NODE_ENV !== "production" &&
  process.env.NODE_ENV !== "test";

const warnDeprecation = (oldName: string, newName: string) => {
  if (isDev()) {
    console.warn(
      `[deprecate] ${oldName} is deprecated, prefer ${newName}`,
    );
  }
};

export function normalizeBaseUrl(url: string): string {
  const normalized = url.replace(/\/+$/, "");
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    throw new Error(`Invalid URL protocol: ${normalized}`);
  }
  return normalized;
}

export function normalizeServerUrl(url: string | undefined): string {
  if (!url) return DEFAULT_SERVER_URL;
  return normalizeBaseUrl(url);
}

function parsePort(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Resolve configuration with backward compatibility
 * Precedence: CLI overrides → Canonical env vars → Legacy env vars → Defaults
 */
export function resolveWebConfig(input?: ConfigInput): WebConfig {
  const env = input?.env ?? (typeof process !== "undefined" ? process.env : {});
  const cli = input?.cliOverrides ?? {};

  let usedLegacy = false;

  // Resolve web host
  let webHost: string;
  let hostSource: string;
  if (cli.host) {
    webHost = cli.host;
    hostSource = "cli";
  } else if (env.OPENCODE_WEB_HOST) {
    webHost = env.OPENCODE_WEB_HOST;
    hostSource = "OPENCODE_WEB_HOST";
  } else if (env.HOST) {
    webHost = env.HOST;
    hostSource = "HOST (legacy)";
    usedLegacy = true;
    warnDeprecation("HOST", "OPENCODE_WEB_HOST");
  } else {
    webHost = DEFAULT_WEB_HOST;
    hostSource = "default";
  }

  // Resolve web port
  let webPort: number;
  let portSource: string;
  if (cli.port) {
    webPort = cli.port;
    portSource = "cli";
  } else if (env.OPENCODE_WEB_PORT) {
    const parsed = parsePort(env.OPENCODE_WEB_PORT);
    if (parsed) {
      webPort = parsed;
      portSource = "OPENCODE_WEB_PORT";
    } else {
      webPort = DEFAULT_WEB_PORT;
      portSource = "default (invalid OPENCODE_WEB_PORT)";
    }
  } else if (env.PORT) {
    const parsed = parsePort(env.PORT);
    if (parsed) {
      webPort = parsed;
      portSource = "PORT (legacy)";
      usedLegacy = true;
      warnDeprecation("PORT", "OPENCODE_WEB_PORT");
    } else {
      webPort = DEFAULT_WEB_PORT;
      portSource = "default (invalid PORT)";
    }
  } else {
    webPort = DEFAULT_WEB_PORT;
    portSource = "default";
  }

  // Resolve server URL
  let serverUrl: string;
  let serverUrlSource: string;
  if (cli.serverUrl) {
    serverUrl = normalizeServerUrl(cli.serverUrl);
    serverUrlSource = "cli";
  } else if (env.OPENCODE_SERVER_URL) {
    serverUrl = normalizeServerUrl(env.OPENCODE_SERVER_URL);
    serverUrlSource = "OPENCODE_SERVER_URL";
  } else if (env.VITE_OPENCODE_SERVER_URL) {
    serverUrl = normalizeServerUrl(env.VITE_OPENCODE_SERVER_URL);
    serverUrlSource = "VITE_OPENCODE_SERVER_URL (legacy)";
    usedLegacy = true;
    warnDeprecation("VITE_OPENCODE_SERVER_URL", "OPENCODE_SERVER_URL");
  } else {
    serverUrl = DEFAULT_SERVER_URL;
    serverUrlSource = "default";
  }

  return {
    webHost,
    webPort,
    serverUrl,
    metadata: {
      hostSource,
      portSource,
      serverUrlSource,
      usedLegacy,
    },
  };
}

/**
 * Resolve server URL from environment (for browser/SSR contexts)
 */
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

  // Use canonical resolution
  const url =
    processEnv?.OPENCODE_SERVER_URL ||
    processEnv?.VITE_OPENCODE_SERVER_URL ||
    importMetaEnv?.VITE_OPENCODE_SERVER_URL ||
    globalRuntimeUrl ||
    DEFAULT_SERVER_URL;

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

  return resolveServerUrlFromEnv();
}

export function getClientOpencodeConfig(): { serverUrl: string } {
  return { serverUrl: resolveServerUrlFromEnv() };
}
