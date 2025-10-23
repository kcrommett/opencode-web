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

const Script = {
  get version() {
    const bump = process.env.OPENCODE_BUMP as "major" | "minor" | "patch" | undefined;
    if (!bump) throw new Error("OPENCODE_BUMP not set");
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    return bumpVersion(pkg.version, bump);
  },
  get channel() {
    return process.env.OPENCODE_CHANNEL ?? "latest";
  },
  get preview() {
    return this.channel === "preview";
  },
};

console.log(`📦 Building opencode-web NPM package v${Script.version}`);

// Clean previous builds
await $`rm -rf packages/opencode-web/dist`;

// Build the web app
console.log("🏗️  Building web application...");
await $`bun run build`;

// Copy built files to package directory
console.log("📋 Copying built files...");
await $`mkdir -p packages/opencode-web/dist`;
await $`cp -r dist/client packages/opencode-web/dist/`;
await $`cp -r dist/server packages/opencode-web/dist/`;
await $`cp server.ts packages/opencode-web/server.ts`;

// Update package.json version in both root and NPM package
const rootPackageJsonPath = "package.json";
const rootPackageJson = JSON.parse(await Bun.file(rootPackageJsonPath).text());
rootPackageJson.version = Script.version;
await Bun.write(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));

const packageJsonPath = "packages/opencode-web/package.json";
const packageJson = JSON.parse(await Bun.file(packageJsonPath).text());
packageJson.version = Script.version;
await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2));

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

console.log(`✅ NPM package built successfully in packages/opencode-web/`);
console.log(`📦 Version: ${Script.version}`);
console.log(`🚀 To test locally: cd packages/opencode-web && npm link`);