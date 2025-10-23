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
const bump = process.env.OPENCODE_BUMP as "major" | "minor" | "patch" | undefined;
if (!bump) throw new Error("OPENCODE_BUMP not set");
const currentPkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
const TARGET_VERSION = bumpVersion(currentPkg.version, bump);

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

const log = (prefix: string, message: string) => console.log(`${prefix} ${message}`);

async function buildNpmPackage() {
  log("INFO", "Building NPM package...");
  await import("./build-npm");
}

async function publishToNpm() {
  const packageDir = "packages/opencode-web";
  
  // Verify version synchronization before publishing
  const rootVersion = JSON.parse(await Bun.file("package.json").text()).version;
  const packageVersion = JSON.parse(await Bun.file(`${packageDir}/package.json`).text()).version;
  
  if (rootVersion !== packageVersion) {
    throw new Error(`Version mismatch: root=${rootVersion}, package=${packageVersion}`);
  }
  
  log("INFO", `Version synchronization verified: ${rootVersion}`);
  
  // Configure NPM authentication
  const npmToken = process.env.NPM_TOKEN;
  if (npmToken) {
    await Bun.write(`${process.env.HOME}/.npmrc`, `//registry.npmjs.org/:_authToken=${npmToken}\n`);
  }
  
  process.chdir(packageDir);

  // Check if already published
  const packageName = JSON.parse(await Bun.file("package.json").text()).name;
  const version = JSON.parse(await Bun.file("package.json").text()).version;

  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/${version}`);
    if (response.ok) {
      log("WARNING", `Version ${version} already published to NPM`);
      return false;
    }
  } catch {
    // Package doesn't exist, continue with publish
  }

  // Determine publish tag
  const tag = Script.preview ? "preview" : "latest";

  log("INFO", `Publishing to NPM with tag: ${tag}`);
  
  const publishCmd = tag === "preview" 
    ? $`npm publish --tag preview`
    : $`npm publish`;

  try {
    await publishCmd;
    log("INFO", `Successfully published ${packageName}@${version} to NPM`);
    return true;
  } catch (error) {
    log("ERROR", `Failed to publish to NPM: ${error}`);
    throw error;
  }
}

async function run() {
  log("INFO", `Publishing opencode-web NPM package v${Script.version}`);

  try {
    await buildNpmPackage();
    
    if (Script.preview) {
      log("INFO", "Preview build - skipping NPM publish");
      return;
    }

    await publishToNpm();
    log("INFO", "NPM publishing complete!");
  } catch (error) {
    log("ERROR", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

await run();