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

// Extract the functions from opencode-config.ts
const normalizeBaseUrlMatch = configContent.match(
  /export function normalizeBaseUrl[\s\S]*?^}/m,
);
const resolveServerUrlFromEnvMatch = configContent.match(
  /function resolveServerUrlFromEnv[\s\S]*?^}/m,
);
const getOpencodeServerUrlMatch = configContent.match(
  /export function getOpencodeServerUrl[\s\S]*?^}/m,
);

if (
  !normalizeBaseUrlMatch ||
  !resolveServerUrlFromEnvMatch ||
  !getOpencodeServerUrlMatch
) {
  throw new Error("Failed to extract config functions");
}

// Create standalone server.ts with inlined functions
const standaloneServerTs = serverTsContent.replace(
  /import \{ getOpencodeServerUrl \} from "\.\/src\/lib\/opencode-config\.js";/,
  `// Inlined config helpers\n${normalizeBaseUrlMatch[0].replace("export ", "")}\n\n${resolveServerUrlFromEnvMatch[0]}\n\n${getOpencodeServerUrlMatch[0].replace("export ", "")}`,
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
const readme = `# OpenCode Web

OpenCode Web is a self-hosted web interface for OpenCode AI assistant.

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
