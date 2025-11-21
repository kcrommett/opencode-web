#!/usr/bin/env bun
import { $ } from "bun";
import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
process.chdir(root);

const bumpVersion = (current: string, bump: "major" | "minor" | "patch") => {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

// Calculate version once at the start
const bump = process.env.OPENCODE_BUMP as
  | "major"
  | "minor"
  | "patch"
  | undefined;
const currentPkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};
// If OPENCODE_BUMP is not set, use the current version (for --skip-bump)
const TARGET_VERSION = bump
  ? bumpVersion(currentPkg.version, bump)
  : currentPkg.version;

const Script = {
  get version() {
    return TARGET_VERSION;
  },
  get channel() {
    return process.env.OPENCODE_CHANNEL ?? "latest";
  },
  get preview() {
    return this.channel === "preview";
  },
};

console.log(`Building opencode-web NPM package v${Script.version}`);

// Clean previous builds
await $`rm -rf packages/opencode-web/dist`;

// Build the web app
console.log("Building web application...");
await $`bun run build`;

// Copy built files to package directory
console.log("Copying built files...");
await $`mkdir -p packages/opencode-web/dist`;
await $`cp -r dist/client packages/opencode-web/dist/`;
await $`cp -r dist/server packages/opencode-web/dist/`;

// Create a standalone server.ts with inlined config helper
console.log("Creating standalone server.ts...");
const serverTsContent = await Bun.file("server.ts").text();
const configContent = await Bun.file("src/lib/opencode-config.ts").text();

const CONFIG_IMPORT_REGEX =
  /import\s+\{[^}]*\}\s+from\s+"\.\/src\/lib\/opencode-config\.js";\s*/;
const SSE_PROXY_IMPORT_REGEX =
  /import\s+\{[^}]*\}\s+from\s+"\.\/packages\/opencode-web\/sse-proxy\.ts";\s*/;

if (!CONFIG_IMPORT_REGEX.test(serverTsContent)) {
  throw new Error(
    "Failed to inline config helpers: import statement not found in server.ts",
  );
}

const stripExports = (source: string) =>
  source
    .replace(/\r\n/g, "\n")
    .replace(/^export\s+(?=(interface|function|const|type|class|enum))/gm, "")
    .trim();

const inlinedConfigHelpers = stripExports(configContent);

const rewriteSseProxyImport = (source: string) => {
  if (!SSE_PROXY_IMPORT_REGEX.test(source)) {
    throw new Error(
      "Failed to rewrite SSE proxy import: statement not found in server.ts",
    );
  }
  return source.replace(
    SSE_PROXY_IMPORT_REGEX,
    'import { proxySseRequest, buildEventUrl } from "./sse-proxy.ts";\n',
  );
};

// Create standalone server.ts with inlined helpers to avoid missing source files.
const standaloneServerTs = rewriteSseProxyImport(
  serverTsContent.replace(
    CONFIG_IMPORT_REGEX,
    `// Inlined config helpers from src/lib/opencode-config.ts\n${inlinedConfigHelpers}\n\n`,
  ),
);

await Bun.write("packages/opencode-web/server.ts", standaloneServerTs);

// Update package.json version in both root and NPM package
const rootPackageJsonPath = "package.json";
const rootPackageJson = JSON.parse(await Bun.file(rootPackageJsonPath).text());
rootPackageJson.version = Script.version;
await Bun.write(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));

const packageJsonPath = "packages/opencode-web/package.json";
const packageJson = JSON.parse(await Bun.file(packageJsonPath).text());
packageJson.version = Script.version;

// Update SDK dependency based on channel
// - For dev/preview builds: Use the latest dev branch from GitHub (includes unreleased MCP features)
// - For production builds: Use the latest stable release from npm
if (Script.channel === "preview" || Script.channel === "dev") {
  const devSdkRef = "github:sst/opencode#dev:packages/sdk/js";
  console.log(
    `[SDK] Using dev branch for ${Script.channel} channel: ${devSdkRef}`,
  );
  packageJson.dependencies["@opencode-ai/sdk"] = devSdkRef;
} else {
  const stableSdkVersion = "^0.15.14";
  console.log(
    `[SDK] Using stable release for ${Script.channel} channel: ${stableSdkVersion}`,
  );
  packageJson.dependencies["@opencode-ai/sdk"] = stableSdkVersion;
}

await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Verify version synchronization
const verifySync = async () => {
  const rootVersion = JSON.parse(
    await Bun.file(rootPackageJsonPath).text(),
  ).version;
  const packageVersion = JSON.parse(
    await Bun.file(packageJsonPath).text(),
  ).version;

  if (rootVersion !== packageVersion) {
    throw new Error(
      `Version mismatch: root=${rootVersion}, package=${packageVersion}`,
    );
  }

  if (rootVersion !== Script.version) {
    throw new Error(
      `Version mismatch: expected=${Script.version}, root=${rootVersion}`,
    );
  }

  console.log(`Version synchronization verified: ${rootVersion}`);
};

await verifySync();

// Create README for the package
const readme = `# OC Web

OC Web is a self-hosted web interface for OpenCode AI assistant.

## Installation

\`\`\`bash
bunx opencode-web
\`\`\`

Or install globally:

\`\`\`bash
bun add -g opencode-web
opencode-web
\`\`\`

## Usage

Once started, open http://localhost:3000 in your browser.

### Environment Variables

- \`PORT\`: Server port (default: 3000)
- \`NODE_ENV\`: Environment (default: production)

## Development

For development, clone the repository and run:

\`\`\`bash
bun install
bun run dev
\`\`\`

## License

MIT
`;

await Bun.write("packages/opencode-web/README.md", readme);

console.log(`NPM package built successfully in packages/opencode-web/`);
console.log(`Version: ${Script.version}`);
console.log(`To test locally: cd packages/opencode-web && npm link`);
