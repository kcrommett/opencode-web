import fs from "fs/promises";
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

export function resolveConfigPath(scope: "global" | "project", directory?: string) {
  if (scope === "project") {
    if (!directory) throw new Error("Project directory is required for project scope");
    return path.join(directory, "opencode.jsonc");
  }
  return GLOBAL_CONFIG_PATH;
}

export async function readConfigFromScope(
  scope: "global" | "project",
  directory?: string,
): Promise<OpencodeConfig | null> {
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
