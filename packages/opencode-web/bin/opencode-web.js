#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, delimiter } from "node:path";
import { createOpencode } from "@opencode-ai/sdk";

if (typeof globalThis.Bun === "undefined") {
  console.error(
    "opencode-web requires the Bun runtime. Run via `bunx opencode-web` or install Bun from https://bun.sh.",
  );
  process.exit(1);
}

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "127.0.0.1";

const usage = `Usage: opencode-web [options]

Options:
  -p, --port <number>           Port for the web UI (default: 3000)
  -H, --host <hostname>         Host/interface to bind both web UI and OpenCode server (default: 127.0.0.1)
      --external-server <url>   Use an existing OpenCode Server
      --no-bundled-server       Skip launching the bundled OpenCode Server
  -v, --version                 Show version number
  -h, --help                    Show this help message
`;

const printUsage = () => {
  console.log(usage);
};

const parseArgs = (argv) => {
  const options = {
    port: undefined,
    host: undefined,
    externalServerUrl: undefined,
    disableBundledServer: false,
    showHelp: false,
    showVersion: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("-")) {
      throw new Error(`Unexpected argument: ${raw}`);
    }

    const eqIndex = raw.indexOf("=");
    const flag = eqIndex >= 0 ? raw.slice(0, eqIndex) : raw;
    let attachedValueUsed = false;
    const attachedValue = eqIndex >= 0 ? raw.slice(eqIndex + 1) : undefined;

    const readValue = (name) => {
      if (!attachedValueUsed && attachedValue !== undefined) {
        attachedValueUsed = true;
        return attachedValue;
      }
      if (i + 1 >= argv.length) {
        throw new Error(`Flag ${name} requires a value`);
      }
      i += 1;
      return argv[i];
    };

    const ensureNoValue = (name) => {
      if (!attachedValueUsed && attachedValue !== undefined) {
        throw new Error(`Flag ${name} does not take a value`);
      }
    };

    switch (flag) {
      case "--port":
      case "-p": {
        const value = readValue(flag);
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          throw new Error(`Invalid port: ${value}`);
        }
        options.port = parsed;
        break;
      }
      case "--host":
      case "-H": {
        const value = readValue(flag);
        options.host = value;
        break;
      }
      case "--external-server":
      case "-s": {
        const value = readValue(flag);
        options.externalServerUrl = value;
        break;
      }
      case "--no-bundled-server":
      case "--disable-bundled-server": {
        ensureNoValue(flag);
        options.disableBundledServer = true;
        break;
      }
      case "--help":
      case "-h": {
        ensureNoValue(flag);
        options.showHelp = true;
        break;
      }
      case "--version":
      case "-v": {
        ensureNoValue(flag);
        options.showVersion = true;
        break;
      }
      case "--": {
        return options;
      }
      default: {
        throw new Error(`Unknown flag: ${flag}`);
      }
    }
  }

  return options;
};

const isTruthy = (value) => {
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  }
  return Boolean(value);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageDir = dirname(__dirname);
process.chdir(packageDir);

const localBinDir = join(packageDir, "node_modules", ".bin");
if (existsSync(localBinDir)) {
  const currentPath = process.env.PATH ?? "";
  const segments = currentPath.split(delimiter).filter(Boolean);
  if (!segments.includes(localBinDir)) {
    process.env.PATH = currentPath
      ? `${localBinDir}${delimiter}${currentPath}`
      : localBinDir;
  }
}

let cliOptions;
try {
  cliOptions = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(
    `[ERROR] ${error instanceof Error ? error.message : String(error)}`,
  );
  printUsage();
  process.exit(1);
}

if (cliOptions.showHelp) {
  printUsage();
  process.exit(0);
}

if (cliOptions.showVersion) {
  const { readFileSync } = await import("node:fs");
  const packageJsonPath = join(packageDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  console.log(packageJson.version);
  process.exit(0);
}

const parsePort = (value) => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const envPort = parsePort(process.env.PORT);
const port = cliOptions.port ?? envPort ?? DEFAULT_PORT;
const host = cliOptions.host ?? process.env.HOST ?? DEFAULT_HOST;

process.env.PORT = port.toString();
process.env.HOST = host;
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const { readFileSync } = await import("node:fs");
const packageJsonPath = join(packageDir, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
console.log(`OpenCode Web v${packageJson.version}`);

const envDisableBundledServer = isTruthy(
  process.env.OPENCODE_WEB_DISABLE_BUNDLED_SERVER,
);
const disableBundledServer =
  Boolean(cliOptions.externalServerUrl) ||
  cliOptions.disableBundledServer ||
  envDisableBundledServer;

let externalServerUrl = cliOptions.externalServerUrl;
if (!externalServerUrl && disableBundledServer) {
  externalServerUrl = process.env.VITE_OPENCODE_SERVER_URL;
}

if (disableBundledServer && !externalServerUrl) {
  console.error(
    "[ERROR] Bundled OpenCode Server disabled but no external server URL provided.",
  );
  console.error(
    "       Use --external-server <url> or set VITE_OPENCODE_SERVER_URL.",
  );
  process.exit(1);
}

if (externalServerUrl) {
  process.env.VITE_OPENCODE_SERVER_URL = externalServerUrl;
  process.env.OPENCODE_SERVER_URL = externalServerUrl;
}

const shouldStartBundledServer = !disableBundledServer && !externalServerUrl;
let stopOpencodeServer;

/**
 * Start OpenCode server on Windows using local CLI installation
 * @param {object} serverOptions Server configuration
 * @returns {Promise<{url: string, stop: Function}>}
 */
const startWindowsOpencodeServer = async (serverOptions) => {
  const args = ["serve"];
  const hostname = serverOptions.hostname ?? "127.0.0.1";
  const serverPort = serverOptions.port ?? 4096;
  
  args.push(`--hostname=${hostname}`);
  args.push(`--port=${serverPort}`);

  console.log(`Spawning local OpenCode CLI: opencode ${args.join(" ")}`);

  const proc = Bun.spawn(["opencode", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
    },
  });

  // Parse server URL from stdout
  const serverUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      proc.kill();
      reject(
        new Error(
          "Timeout waiting for OpenCode server to start after 10 seconds.\n" +
            "Ensure 'opencode' is installed and accessible in your PATH.",
        ),
      );
    }, 10000);

    let stdout = "";
    let stderr = "";

    const stdoutReader = proc.stdout.getReader();
    const stderrReader = proc.stderr.getReader();

    const decoder = new TextDecoder();

    // Read stdout
    (async () => {
      try {
        while (true) {
          const { done, value } = await stdoutReader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          stdout += chunk;
          
          // Look for server ready message: "opencode server listening on http://..."
          const lines = stdout.split("\n");
          for (const line of lines) {
            if (line.includes("opencode server listening")) {
              const match = line.match(/on\s+(https?:\/\/[^\s]+)/);
              if (match) {
                clearTimeout(timeout);
                resolve(match[1]);
                return;
              }
            }
          }
        }
      } catch (error) {
        // Stream closed
      }
    })();

    // Read stderr
    (async () => {
      try {
        while (true) {
          const { done, value } = await stderrReader.read();
          if (done) break;
          stderr += decoder.decode(value, { stream: true });
        }
      } catch (error) {
        // Stream closed
      }
    })();

    // Handle process exit
    proc.exited.then((exitCode) => {
      clearTimeout(timeout);
      let msg = `OpenCode server process exited with code ${exitCode}`;
      if (stdout.trim() || stderr.trim()) {
        msg += `\nOutput:\n${stdout}${stderr}`;
      }
      reject(new Error(msg));
    });
  });

  return {
    url: serverUrl,
    stop: () => {
      proc.kill();
    },
  };
};

if (shouldStartBundledServer) {
  const isWindows = process.platform === "win32";
  
  if (isWindows) {
    console.log("Starting local OpenCode Server (Windows)...");
  } else {
    console.log("Starting bundled OpenCode Server via SDK...");
  }

  const serverOptions = {};
  const requestedPort = process.env.OPENCODE_SERVER_PORT;
  const requestedHost = process.env.OPENCODE_SERVER_HOSTNAME;

  if (requestedPort) {
    const parsedPort = Number.parseInt(requestedPort, 10);
    if (Number.isNaN(parsedPort)) {
      console.warn(
        `[WARN] Ignoring invalid OPENCODE_SERVER_PORT value: ${requestedPort}`,
      );
    } else {
      serverOptions.port = parsedPort;
    }
  }

  if (requestedHost) {
    serverOptions.hostname = requestedHost;
  } else if (host && host !== "127.0.0.1") {
    // If --host is specified and not the default, use it for the OpenCode server too
    serverOptions.hostname = host;
  }

  try {
    let serverUrl;
    
    if (isWindows) {
      // On Windows, use local CLI installation
      const result = await startWindowsOpencodeServer(serverOptions);
      serverUrl = result.url;
      stopOpencodeServer = () => {
        result.stop();
        stopOpencodeServer = undefined;
      };
    } else {
      // On other platforms, use bundled SDK
      const { server } = await createOpencode(serverOptions);
      serverUrl = server.url;
      stopOpencodeServer = () => {
        server.close();
        stopOpencodeServer = undefined;
      };
    }
    
    process.env.VITE_OPENCODE_SERVER_URL = serverUrl;
    process.env.OPENCODE_SERVER_URL = serverUrl;
    
    // Get OpenCode version info
    let versionInfo = "unknown";
    try {
      if (isWindows) {
        // On Windows, try to get version from CLI
        const versionProc = Bun.spawnSync(["opencode", "--version"], {
          stdout: "pipe",
        });
        if (versionProc.exitCode === 0) {
          versionInfo = new TextDecoder().decode(versionProc.stdout).trim();
        }
      } else {
        // On other platforms, get version from opencode-ai package
        let opencodePackageJsonPath = join(
          packageDir,
          "node_modules",
          "opencode-ai",
          "package.json",
        );
        
        if (!existsSync(opencodePackageJsonPath)) {
          opencodePackageJsonPath = join(
            packageDir,
            "..",
            "..",
            "node_modules",
            "opencode-ai",
            "package.json",
          );
        }
        
        if (existsSync(opencodePackageJsonPath)) {
          const opencodePackageJson = JSON.parse(
            readFileSync(opencodePackageJsonPath, "utf8"),
          );
          versionInfo = `v${opencodePackageJson.version}`;
        }
      }
    } catch {
      // Ignore errors reading version
    }
    
    console.log(`OpenCode Server ${versionInfo} listening at ${serverUrl}`);
  } catch (error) {
    console.error("[ERROR] Failed to start OpenCode Server.");
    
    // Provide helpful error message for Windows users
    if (isWindows && error instanceof Error && 
        (error.message.includes("Timeout") || error.message.includes("ENOENT"))) {
      console.error("");
      console.error("The 'opencode' CLI is not found or failed to start.");
      console.error("Please ensure OpenCode is installed and available in your PATH:");
      console.error("  - Download from: https://github.com/opencode-ai/opencode");
      console.error("  - Or use an external server with: --external-server <url>");
    }
    
    console.error(
      error instanceof Error ? (error.stack ?? error.message) : error,
    );
    process.exit(1);
  }
} else if (externalServerUrl) {
  console.log(`ℹ️ Using external OpenCode Server: ${externalServerUrl}`);
} else {
  console.log(
    "ℹ️ Bundled OpenCode Server disabled via OPENCODE_WEB_DISABLE_BUNDLED_SERVER.",
  );
}

const cleanup = () => {
  if (stopOpencodeServer) {
    stopOpencodeServer();
  }
};

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

process.on("exit", cleanup);

const displayHost = host === "0.0.0.0" ? "0.0.0.0" : host;
console.log(`Starting OpenCode Web server on http://${displayHost}:${port}`);
if (host === "0.0.0.0") {
  console.log("Listening on all network interfaces");
}
console.log(`Serving from: ${packageDir}`);

const serverPath = join(packageDir, "server.ts");
await import(serverPath);
