/**
 * Cross-platform wrapper for @opencode-ai/sdk
 * 
 * This module provides a Windows-compatible wrapper around the OpenCode SDK's
 * server spawning functionality. The SDK spawns the `opencode` CLI binary
 * which may have platform-specific issues on Windows.
 * 
 * Key fixes:
 * 1. On Windows, Node.js spawn() needs shell:true or .cmd extension for npm binaries
 * 2. Proper shell detection and configuration for cross-platform compatibility
 */

import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";

/**
 * Cross-platform wrapper for createOpencodeServer that handles Windows compatibility
 */
export async function createOpencodeServer(options) {
  options = Object.assign(
    {
      hostname: "127.0.0.1",
      port: 4096,
      timeout: 5000,
    },
    options ?? {}
  );

  // On Windows, we need to either:
  // 1. Use shell:true to let Windows resolve .cmd files
  // 2. Or explicitly add .cmd extension
  // We'll use shell:true for better compatibility
  const spawnOptions = {
    signal: options.signal,
    env: {
      ...process.env,
      OPENCODE_CONFIG_CONTENT: JSON.stringify(options.config ?? {}),
    },
  };

  // On Windows, enable shell mode to properly resolve npm binaries (opencode.cmd)
  if (isWindows) {
    spawnOptions.shell = true;
  }

  const proc = spawn(
    `opencode`,
    [`serve`, `--hostname=${options.hostname}`, `--port=${options.port}`],
    spawnOptions
  );

  const url = await new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(
        new Error(
          `Timeout waiting for server to start after ${options.timeout}ms`
        )
      );
    }, options.timeout);

    let output = "";
    proc.stdout?.on("data", (chunk) => {
      output += chunk.toString();
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.startsWith("opencode server listening")) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/);
          if (!match) {
            throw new Error(
              `Failed to parse server url from output: ${line}`
            );
          }
          clearTimeout(id);
          resolve(match[1]);
          return;
        }
      }
    });

    proc.stderr?.on("data", (chunk) => {
      output += chunk.toString();
    });

    proc.on("exit", (code) => {
      clearTimeout(id);
      let msg = `Server exited with code ${code}`;
      if (output.trim()) {
        msg += `\nServer output: ${output}`;
      }
      reject(new Error(msg));
    });

    proc.on("error", (error) => {
      clearTimeout(id);
      reject(error);
    });

    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        clearTimeout(id);
        reject(new Error("Aborted"));
      });
    }
  });

  return {
    url,
    close() {
      proc.kill();
    },
  };
}

/**
 * Cross-platform wrapper for createOpencode
 */
export async function createOpencode(options) {
  const server = await createOpencodeServer({
    ...options,
  });

  // We still need the client from the original SDK
  const { createOpencodeClient } = await import("@opencode-ai/sdk/client");

  const client = createOpencodeClient({
    baseUrl: server.url,
  });

  return {
    client,
    server,
  };
}