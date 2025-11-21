import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import type { OpencodeConfig, ConfigUpdateResponse } from "@/types/opencode";
import { mergeConfigUpdate } from "./opencode-config-helpers";

const GLOBAL_CONFIG_PATH = path.join(
  os.homedir(),
  ".config",
  "opencode",
  "opencode.jsonc",
);

const PROJECT_CONFIG_CANDIDATES = [
  path.join(".opencode", "opencode.jsonc"),
  path.join(".opencode", "opencode.json"),
  "opencode.jsonc",
  "opencode.json",
];

function stripJsonComments(value: string): string {
  // Remove block comments
  let output = value.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove line comments that aren't part of URLs like https://
  output = output.replace(/(^|[^:\\\"'])\/\/.*$/gm, "$1");
  return output;
}

async function readConfigFile(filePath: string): Promise<OpencodeConfig | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const sanitized = stripJsonComments(raw).trim();
    if (!sanitized) return {} as OpencodeConfig;
    return JSON.parse(sanitized) as OpencodeConfig;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw new Error(
      `Failed to read config file at ${filePath}: ${error?.message ?? error}`,
    );
  }
}

async function writeConfigFile(filePath: string, config: OpencodeConfig) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const contents = `${JSON.stringify(config, null, 2)}\n`;
  await fs.writeFile(filePath, contents, "utf8");
}

function normalizeEnvPath(value: string, directory?: string) {
  if (path.isAbsolute(value)) {
    return value;
  }
  if (directory) {
    return path.join(directory, value);
  }
  return path.resolve(value);
}

function resolveProjectScopePath(directory?: string) {
  if (!directory) {
    throw new Error("Project directory is required for project scope");
  }

  const inlineConfig = process.env.OPENCODE_CONFIG_CONTENT;
  if (inlineConfig && inlineConfig.length > 0) {
    throw new Error(
      "Cannot resolve project config path when OPENCODE_CONFIG_CONTENT is set",
    );
  }

  const explicitConfigPath = process.env.OPENCODE_CONFIG;
  if (explicitConfigPath && explicitConfigPath.length > 0) {
    return normalizeEnvPath(explicitConfigPath, directory);
  }

  const overrideDir = process.env.OPENCODE_CONFIG_DIR;
  if (overrideDir && overrideDir.length > 0) {
    const resolvedDir = normalizeEnvPath(overrideDir, directory);
    const preferredJsonc = path.join(resolvedDir, "opencode.jsonc");
    if (existsSync(preferredJsonc)) {
      return preferredJsonc;
    }
    const preferredJson = path.join(resolvedDir, "opencode.json");
    if (existsSync(preferredJson)) {
      return preferredJson;
    }
    return preferredJsonc;
  }

  const absoluteDirectory = path.resolve(directory);
  const candidates = PROJECT_CONFIG_CANDIDATES.map((candidate) =>
    path.join(absoluteDirectory, candidate),
  );
  const existing = candidates.find((candidate) => existsSync(candidate));
  return existing ?? candidates[0];
}

export function resolveConfigPath(scope: "global" | "project", directory?: string) {
  if (scope === "project") {
    return resolveProjectScopePath(directory);
  }
  return GLOBAL_CONFIG_PATH;
}

function readInlineConfigContent(): OpencodeConfig | null {
  const inline = process.env.OPENCODE_CONFIG_CONTENT;
  if (!inline || inline.trim().length === 0) {
    return null;
  }

  try {
    const sanitized = stripJsonComments(inline).trim();
    if (!sanitized) {
      return {} as OpencodeConfig;
    }
    return JSON.parse(sanitized) as OpencodeConfig;
  } catch (error: any) {
    throw new Error(
      `Failed to parse inline OPENCODE_CONFIG_CONTENT: ${error?.message ?? error}`,
    );
  }
}

export async function readConfigFromScope(
  scope: "global" | "project",
  directory?: string,
): Promise<OpencodeConfig | null> {
  const inlineConfig = readInlineConfigContent();
  if (inlineConfig) {
    return inlineConfig;
  }

  try {
    const filePath = resolveConfigPath(scope, directory);
    return await readConfigFile(filePath);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function updateConfigFileLocal(
  updates: Record<string, unknown>,
  scope: "global" | "project",
  directory?: string,
): Promise<ConfigUpdateResponse> {
  if (process.env.OPENCODE_CONFIG_CONTENT) {
    throw new Error(
      "Cannot persist config locally when OPENCODE_CONFIG_CONTENT is set",
    );
  }

  const filepath = resolveConfigPath(scope, directory);
  const currentConfig = await readConfigFile(filepath);
  const merged = mergeConfigUpdate(
    currentConfig,
    updates as Partial<OpencodeConfig>,
  );
  await writeConfigFile(filepath, merged);
  return {
    merged,
    scope,
    filepath,
  };
}
