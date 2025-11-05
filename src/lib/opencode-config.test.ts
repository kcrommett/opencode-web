import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  resolveWebConfig,
  normalizeServerUrl,
  normalizeBaseUrl,
  type WebConfig,
} from "./opencode-config";

describe("normalizeBaseUrl", () => {
  it("removes trailing slashes", () => {
    expect(normalizeBaseUrl("http://localhost:4096/")).toBe(
      "http://localhost:4096",
    );
    expect(normalizeBaseUrl("http://localhost:4096///")).toBe(
      "http://localhost:4096",
    );
  });

  it("validates URL protocol", () => {
    expect(() => normalizeBaseUrl("localhost:4096")).toThrow(
      "Invalid URL protocol",
    );
    expect(() => normalizeBaseUrl("ftp://localhost:4096")).toThrow(
      "Invalid URL protocol",
    );
  });

  it("accepts valid http and https URLs", () => {
    expect(normalizeBaseUrl("http://localhost:4096")).toBe(
      "http://localhost:4096",
    );
    expect(normalizeBaseUrl("https://example.com:5000")).toBe(
      "https://example.com:5000",
    );
  });
});

describe("normalizeServerUrl", () => {
  it("returns default when undefined", () => {
    expect(normalizeServerUrl(undefined)).toBe("http://localhost:4096");
  });

  it("normalizes valid URLs", () => {
    expect(normalizeServerUrl("http://10.0.0.5:5000/")).toBe(
      "http://10.0.0.5:5000",
    );
  });
});

describe("resolveWebConfig", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleWarnSpy: typeof console.warn;
  const warnings: string[] = [];

  beforeEach(() => {
    originalEnv = { ...process.env };
    warnings.length = 0;
    consoleWarnSpy = console.warn;
    console.warn = (msg: string) => {
      warnings.push(msg);
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    console.warn = consoleWarnSpy;
  });

  describe("defaults", () => {
    it("returns all defaults when no env or CLI provided", () => {
      const config = resolveWebConfig({ env: {} });
      expect(config.webHost).toBe("localhost");
      expect(config.webPort).toBe(3000);
      expect(config.serverUrl).toBe("http://localhost:4096");
      expect(config.metadata.hostSource).toBe("default");
      expect(config.metadata.portSource).toBe("default");
      expect(config.metadata.serverUrlSource).toBe("default");
      expect(config.metadata.usedLegacy).toBe(false);
    });
  });

  describe("canonical environment variables", () => {
    it("resolves OPENCODE_WEB_HOST", () => {
      const config = resolveWebConfig({
        env: { OPENCODE_WEB_HOST: "0.0.0.0" },
      });
      expect(config.webHost).toBe("0.0.0.0");
      expect(config.metadata.hostSource).toBe("OPENCODE_WEB_HOST");
      expect(config.metadata.usedLegacy).toBe(false);
    });

    it("resolves OPENCODE_WEB_PORT", () => {
      const config = resolveWebConfig({
        env: { OPENCODE_WEB_PORT: "8888" },
      });
      expect(config.webPort).toBe(8888);
      expect(config.metadata.portSource).toBe("OPENCODE_WEB_PORT");
      expect(config.metadata.usedLegacy).toBe(false);
    });

    it("resolves OPENCODE_SERVER_URL", () => {
      const config = resolveWebConfig({
        env: { OPENCODE_SERVER_URL: "http://10.0.0.5:5000" },
      });
      expect(config.serverUrl).toBe("http://10.0.0.5:5000");
      expect(config.metadata.serverUrlSource).toBe("OPENCODE_SERVER_URL");
      expect(config.metadata.usedLegacy).toBe(false);
    });
  });

  describe("legacy environment variables", () => {
    it("falls back to HOST with warning", () => {
      process.env.NODE_ENV = "development";
      const config = resolveWebConfig({
        env: { HOST: "192.168.1.100" },
      });
      expect(config.webHost).toBe("192.168.1.100");
      expect(config.metadata.hostSource).toBe("HOST (legacy)");
      expect(config.metadata.usedLegacy).toBe(true);
      expect(warnings.some((w) => w.includes("HOST is deprecated"))).toBe(true);
    });

    it("falls back to PORT with warning", () => {
      process.env.NODE_ENV = "development";
      const config = resolveWebConfig({
        env: { PORT: "4500" },
      });
      expect(config.webPort).toBe(4500);
      expect(config.metadata.portSource).toBe("PORT (legacy)");
      expect(config.metadata.usedLegacy).toBe(true);
      expect(warnings.some((w) => w.includes("PORT is deprecated"))).toBe(true);
    });

    it("falls back to VITE_OPENCODE_SERVER_URL with warning", () => {
      process.env.NODE_ENV = "development";
      const config = resolveWebConfig({
        env: { VITE_OPENCODE_SERVER_URL: "http://127.0.0.1:5002" },
      });
      expect(config.serverUrl).toBe("http://127.0.0.1:5002");
      expect(config.metadata.serverUrlSource).toBe(
        "VITE_OPENCODE_SERVER_URL (legacy)",
      );
      expect(config.metadata.usedLegacy).toBe(true);
      expect(
        warnings.some((w) =>
          w.includes("VITE_OPENCODE_SERVER_URL is deprecated"),
        ),
      ).toBe(true);
    });

    it("does not warn in production", () => {
      process.env.NODE_ENV = "production";
      const config = resolveWebConfig({
        env: { HOST: "0.0.0.0", PORT: "8080" },
      });
      expect(config.metadata.usedLegacy).toBe(true);
      expect(warnings.length).toBe(0);
    });
  });

  describe("precedence", () => {
    it("CLI overrides canonical env", () => {
      const config = resolveWebConfig({
        env: {
          OPENCODE_WEB_HOST: "0.0.0.0",
          OPENCODE_WEB_PORT: "8888",
          OPENCODE_SERVER_URL: "http://env-server:5000",
        },
        cliOverrides: {
          host: "127.0.0.1",
          port: 9999,
          serverUrl: "http://cli-server:6000",
        },
      });
      expect(config.webHost).toBe("127.0.0.1");
      expect(config.webPort).toBe(9999);
      expect(config.serverUrl).toBe("http://cli-server:6000");
      expect(config.metadata.hostSource).toBe("cli");
      expect(config.metadata.portSource).toBe("cli");
      expect(config.metadata.serverUrlSource).toBe("cli");
    });

    it("canonical env overrides legacy env", () => {
      const config = resolveWebConfig({
        env: {
          OPENCODE_WEB_HOST: "canonical-host",
          HOST: "legacy-host",
          OPENCODE_WEB_PORT: "7777",
          PORT: "8888",
          OPENCODE_SERVER_URL: "http://canonical:5000",
          VITE_OPENCODE_SERVER_URL: "http://legacy:5001",
        },
      });
      expect(config.webHost).toBe("canonical-host");
      expect(config.webPort).toBe(7777);
      expect(config.serverUrl).toBe("http://canonical:5000");
      expect(config.metadata.usedLegacy).toBe(false);
    });

    it("legacy env overrides defaults", () => {
      const config = resolveWebConfig({
        env: {
          HOST: "legacy-host",
          PORT: "9999",
        },
      });
      expect(config.webHost).toBe("legacy-host");
      expect(config.webPort).toBe(9999);
      expect(config.metadata.usedLegacy).toBe(true);
    });
  });

  describe("invalid values", () => {
    it("handles invalid port numbers", () => {
      const config = resolveWebConfig({
        env: { OPENCODE_WEB_PORT: "not-a-number" },
      });
      expect(config.webPort).toBe(3000);
      expect(config.metadata.portSource).toBe(
        "default (invalid OPENCODE_WEB_PORT)",
      );
    });

    it("handles negative port numbers", () => {
      const config = resolveWebConfig({
        env: { PORT: "-1" },
      });
      expect(config.webPort).toBe(3000);
      expect(config.metadata.portSource).toBe("default (invalid PORT)");
    });

    it("handles zero port", () => {
      const config = resolveWebConfig({
        env: { OPENCODE_WEB_PORT: "0" },
      });
      expect(config.webPort).toBe(3000);
      expect(config.metadata.portSource).toBe(
        "default (invalid OPENCODE_WEB_PORT)",
      );
    });
  });

  describe("special cases", () => {
    it("handles 0.0.0.0 host", () => {
      const config = resolveWebConfig({
        env: { OPENCODE_WEB_HOST: "0.0.0.0" },
      });
      expect(config.webHost).toBe("0.0.0.0");
    });

    it("normalizes server URL trailing slashes", () => {
      const config = resolveWebConfig({
        env: { OPENCODE_SERVER_URL: "http://localhost:5000///" },
      });
      expect(config.serverUrl).toBe("http://localhost:5000");
    });
  });
});
