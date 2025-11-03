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

/**
 * Detect if running via bunx on Windows
 * bunx creates temporary install directories that follow patterns like:
 * - C:\Users\...\AppData\Local\Temp\bunx-<random>-<package>
 * - Contains .bunx in the path
 */
const isBunxOnWindows = () => {
  if (process.platform !== "win32") {
    return false;
  }
  
  const cwd = process.cwd();
  const scriptPath = process.argv[1] || "";
  
  // Check for bunx temporary directory patterns
  const bunxPatterns = [
    /bunx-\d+-/i,      // bunx-12345-opencode-web
    /\.bunx/i,         // .bunx directory
    /Temp.*bunx/i,     // Temp directory with bunx
  ];
  
  return bunxPatterns.some(pattern => 
    pattern.test(cwd) || pattern.test(scriptPath)
  );
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

  // Try to find the actual Windows OpenCode binary
  let opencodeCommand = "opencode"; // fallback to PATH
  
  // Look for Windows binary in node_modules first (for bunx compatibility)
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  
  if (os.platform() === 'win32') {
    let arch;
    switch (os.arch()) {
      case 'x64': arch = 'x64'; break;
      case 'arm64': arch = 'arm64'; break;
      default: arch = os.arch(); break;
    }
    
    const packageName = `opencode-windows-${arch}`;
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    const binaryPath = path.join(nodeModulesPath, packageName, 'bin', 'opencode.exe');
    
    if (fs.existsSync(binaryPath)) {
      opencodeCommand = binaryPath;
      console.log(`Using OpenCode binary from: ${binaryPath}`);
    }
  }

  console.log(`Spawning local OpenCode CLI: ${opencodeCommand} ${args.join(" ")}`);

  const proc = Bun.spawn(["cmd.exe", "/c", opencodeCommand, ...args], {
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
  
  // Detect bunx on Windows - bunx cannot launch bundled server due to Bun's /bin/sh limitation
  const isBunxOnWindows = isWindows && (() => {
    const cwd = process.cwd();
    const scriptPath = process.argv[1] || "";
    
    // Check for bunx temporary directory patterns
    const bunxPatterns = [
      /bunx-\d+-/i,      // bunx-12345-opencode-web
      /\.bunx/i,         // .bunx directory
      /Temp.*bunx/i,     // Temp directory with bunx
    ];
    
    return bunxPatterns.some(pattern => 
      pattern.test(cwd) || pattern.test(scriptPath)
    );
  })();
  
  if (isBunxOnWindows) {
    console.error("");
    console.error("[ERROR] Cannot launch bundled OpenCode Server via 'bunx' on Windows.");
    console.error("");
    console.error("This is a known limitation caused by Bun's /bin/sh remapping on Windows.");
    console.error("The bundled server requires the 'opencode' CLI, which fails to start under bunx.");
    console.error("");
    console.error("✅ Recommended workarounds:");
    console.error("");
    console.error("  1. Use an external OpenCode Server:");
    console.error("     bunx opencode-web@latest --external-server http://127.0.0.1:4096");
    console.error("");
    console.error("  2. Install locally and run:");
    console.error("     bun install opencode-web");
    console.error("     bun run opencode-web");
    console.error("");
    console.error("  3. Clone and build from source:");
    console.error("     git clone https://github.com/sst/opencode-web");
    console.error("     cd opencode-web");
    console.error("     bun install && bun run build");
    console.error("     bun run packages/opencode-web/bin/opencode-web.js");
    console.error("");
    console.error("📚 For more details, see the Windows troubleshooting section in:");
    console.error("   https://github.com/sst/opencode-web#windows-bunx-limitation");
    console.error("");
    process.exit(1);
  }
  
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
        // On Windows, try to get version from the Windows binary directly
        let opencodeBinary = "opencode"; // fallback
        
        const os = require('os');
        const path = require('path');
        const fs = require('fs');
        
        let arch;
        switch (os.arch()) {
          case 'x64': arch = 'x64'; break;
          case 'arm64': arch = 'arm64'; break;
          default: arch = os.arch(); break;
        }
        
        const packageName = `opencode-windows-${arch}`;
        const nodeModulesPath = path.join(__dirname, '..', 'node_modules', 'opencode-ai', 'node_modules');
        const binaryPath = path.join(nodeModulesPath, packageName, 'bin', 'opencode.exe');
        
        if (fs.existsSync(binaryPath)) {
          opencodeBinary = binaryPath;
        }
        
        const versionProc = Bun.spawnSync(["cmd.exe", "/c", opencodeBinary, "--version"], {
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
    console.error("");
    
    // Provide helpful error message for Windows users
    if (isWindows && error instanceof Error && 
        (error.message.includes("Timeout") || error.message.includes("ENOENT") || 
         error.message.includes("/bin/sh") || error.message.includes("interpreter executable"))) {
      console.error("The 'opencode' CLI is not found or failed to start.");
      console.error("");
      console.error("Common causes on Windows:");
      console.error("  • OpenCode CLI not installed or not in PATH");
      console.error("  • Running via 'bunx' (see workarounds below)");
      console.error("  • Missing Windows binary for your architecture");
      console.error("");
      console.error("✅ Solutions:");
      console.error("");
      console.error("  1. Install OpenCode CLI:");
      console.error("     Download from: https://github.com/opencode-ai/opencode");
      console.error("");
      console.error("  2. Use an external OpenCode Server:");
      console.error("     opencode-web --external-server http://127.0.0.1:4096");
      console.error("");
      console.error("  3. Install locally instead of bunx:");
      console.error("     bun install opencode-web");
      console.error("     bun run opencode-web");
      console.error("");
      console.error("📚 See troubleshooting docs:");
      console.error("   https://github.com/sst/opencode-web#windows-troubleshooting");
      console.error("");
    }
    
    console.error("Error details:");
    console.error(
      error instanceof Error ? (error.stack ?? error.message) : error,
    );
    console.error("");
    process.exit(1);
  }
} else if (externalServerUrl) {
  console.log(`ℹ️ Using external OpenCode Server: ${externalServerUrl}`);
  
  // On Windows, remind users this is required for bunx
  if (process.platform === "win32") {
    const cwd = process.cwd();
    const scriptPath = process.argv[1] || "";
    const bunxPatterns = [/bunx-\d+-/i, /\.bunx/i, /Temp.*bunx/i];
    const isBunx = bunxPatterns.some(pattern => 
      pattern.test(cwd) || pattern.test(scriptPath)
    );
    
    if (isBunx) {
      console.log("   (External server is required when using 'bunx' on Windows)");
    }
  }
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

const distServerEntry = join(packageDir, "dist", "server", "server.js");
if (!existsSync(distServerEntry)) {
  const workspaceDistDir = join(packageDir, "..", "..", "dist");
  const workspaceServerEntry = join(
    workspaceDistDir,
    "server",
    "server.js",
  );

  if (existsSync(workspaceServerEntry)) {
    console.log(
      "Detected workspace build output. Copying dist/ into the package directory...",
    );
    const { rm, mkdir, cp } = await import("node:fs/promises");
    const packageDistDir = join(packageDir, "dist");

    await rm(packageDistDir, { recursive: true, force: true });
    await mkdir(packageDistDir, { recursive: true });
    await cp(join(workspaceDistDir, "client"), join(packageDistDir, "client"), {
      recursive: true,
    });
    await cp(join(workspaceDistDir, "server"), join(packageDistDir, "server"), {
      recursive: true,
    });
  }
}

if (!existsSync(distServerEntry)) {
  console.error(
    `[ERROR] Build output missing at ${distServerEntry}. Run \`bun run build\` (or \`bun run build:npm\` when preparing the npm package) before starting the bundled server.`,
  );
  console.error(
    "       If you're using a published opencode-web package, reinstall it to restore the dist/ directory.",
  );
  process.exit(1);
}

const serverPath = join(packageDir, "server.ts");
await import(serverPath);
