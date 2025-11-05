import type { Part, ToolPartDetail, DiffMetadata } from "@/types/opencode";
import { parseDiff, extractDiffPaths } from "./diff-utils";

/**
 * Status mapping from various sources to normalized enum
 */
export const TOOL_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  error: "Error",
  success: "Success",
  failed: "Failed",
} as const;

/**
 * Extract normalized tool status from part
 */
export function normalizeToolStatus(
  part: Part
): "pending" | "running" | "completed" | "error" {
  // Check direct status field
  if (typeof part.status === "string") {
    const normalized = part.status.toLowerCase();
    if (
      normalized === "pending" ||
      normalized === "running" ||
      normalized === "completed" ||
      normalized === "error"
    ) {
      return normalized as "pending" | "running" | "completed" | "error";
    }
    // Map common aliases
    if (normalized === "success") return "completed";
    if (normalized === "failed") return "error";
  }

  // Check state.status
  const state = (part as { state?: { status?: unknown } }).state;
  if (state && typeof state === "object" && "status" in state) {
    const stateStatus = (state as { status?: string }).status;
    if (typeof stateStatus === "string") {
      const normalized = stateStatus.toLowerCase();
      if (
        normalized === "pending" ||
        normalized === "running" ||
        normalized === "completed" ||
        normalized === "error"
      ) {
        return normalized as "pending" | "running" | "completed" | "error";
      }
      if (normalized === "success") return "completed";
      if (normalized === "failed") return "error";
    }
  }

  // Default to pending if no status found
  return "pending";
}

/**
 * Extract tool name from part
 */
export function extractToolName(part: Part): string {
  if (typeof part.tool === "string" && part.tool.length > 0) {
    return part.tool;
  }
  if (typeof part.name === "string" && part.name.length > 0) {
    return part.name;
  }
  return "unknown";
}

const FILE_PATH_KEYS = [
  "filePath",
  "path",
  "file",
  "filename",
  "inputPath",
  "outputPath",
  "source",
  "target",
] as const;

const MAX_PATH_SEARCH_DEPTH = 5;

function normalizePotentialPath(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const withoutQuotes = trimmed.replace(/^["'`]+|["'`]+$/g, "");
  const withoutScheme = withoutQuotes.replace(/^file:\/\//i, "");

  if (!isLikelyPath(withoutScheme)) {
    return undefined;
  }

  return withoutScheme;
}

function isLikelyPath(value: string): boolean {
  if (!value) {
    return false;
  }

  if (/^[A-Za-z]:\\/.test(value)) {
    return true;
  }

  if (value.includes("/") || value.includes("\\")) {
    return true;
  }

  if (/^[.~]/.test(value)) {
    return true;
  }

  if (/\.[A-Za-z0-9]{1,8}$/.test(value)) {
    return true;
  }

  return false;
}

function extractPathFromValue(
  value: unknown,
  visited: Set<unknown>,
  depth: number,
): string | undefined {
  if (depth >= MAX_PATH_SEARCH_DEPTH) {
    return undefined;
  }

  if (typeof value === "string") {
    const normalized = normalizePotentialPath(value);
    if (normalized) {
      return normalized;
    }

    const trimmed = value.trim();
    const keyMatch = trimmed.match(
      /\b(?:filePath|filepath|path|file|filename)\b\s*[:=]\s*["'`]?([^"'`\n\r]+)["'`]?\s*$/i,
    );
    if (keyMatch) {
      const extracted = normalizePotentialPath(keyMatch[1]);
      if (extracted) {
        return extracted;
      }
    }

    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractPathFromValue(parsed, visited, depth + 1);
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    if (visited.has(value)) {
      return undefined;
    }

    visited.add(value);
    for (const item of value) {
      const result = extractPathFromValue(item, visited, depth + 1);
      if (result) {
        return result;
      }
    }

    return undefined;
  }

  if (typeof value === "object") {
    if (visited.has(value)) {
      return undefined;
    }

    visited.add(value);
    const record = value as Record<string, unknown>;

    for (const key of FILE_PATH_KEYS) {
      if (key in record) {
        const candidate = extractPathFromValue(
          record[key],
          visited,
          depth + 1,
        );
        if (candidate) {
          return candidate;
        }
      }
    }

    for (const child of Object.values(record)) {
      const candidate = extractPathFromValue(child, visited, depth + 1);
      if (candidate) {
        return candidate;
      }
    }
  }

  return undefined;
}

/**
 * Extract file path from tool part (from args or direct path field)
 */
export function extractFilePath(part: Part): string | undefined {
  if (typeof part.path === "string" && part.path.trim().length > 0) {
    return part.path;
  }

  const candidateSources: unknown[] = [
    part.args,
    (part as { input?: unknown }).input,
    (part as { output?: unknown }).output,
    (part as { state?: unknown }).state,
    (part as { result?: unknown }).result,
    part,
  ];

  for (const source of candidateSources) {
    const candidate = extractPathFromValue(source, new Set<unknown>(), 0);
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Extract timing information from part state
 */
export function extractTimings(part: Part): {
  duration?: number;
  startTime?: number;
  endTime?: number;
} {
  const state = (part as { state?: { timings?: unknown } }).state;
  if (!state || typeof state !== "object") {
    return {};
  }

  const timings = (state as { timings?: unknown }).timings;
  if (!timings || typeof timings !== "object") {
    return {};
  }

  const timingsObj = timings as {
    duration?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };

  return {
    duration:
      typeof timingsObj.duration === "number" ? timingsObj.duration : undefined,
    startTime:
      typeof timingsObj.startTime === "number"
        ? timingsObj.startTime
        : undefined,
    endTime:
      typeof timingsObj.endTime === "number" ? timingsObj.endTime : undefined,
  };
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Extract error information from part
 */
export function extractError(part: Part): {
  message?: string;
  stack?: string;
} {
  // 1) Prefer explicit error field if present (object with message/stack)
  const directError = (part as { error?: unknown }).error;
  if (directError && typeof directError === "object") {
    const errorObj = directError as { message?: unknown; stack?: unknown };
    const message = typeof errorObj.message === "string" ? errorObj.message : undefined;
    const stack = typeof errorObj.stack === "string" ? errorObj.stack : undefined;
    if (message || stack) return { message, stack };
  }

  const status = normalizeToolStatus(part);

  // 2) Tool state error shape from upstream API: state.status === 'error' and state.error is a string
  const state = (part as { state?: unknown }).state as
    | { status?: string; error?: unknown; metadata?: unknown }
    | undefined;
  if (status === "error" && state && typeof state === "object") {
    if (typeof state.error === "string" && state.error.trim()) {
      return { message: state.error };
    }
    // Some tools may stash error under metadata.error
    const meta = (state as { metadata?: unknown }).metadata;
    if (meta && typeof meta === "object") {
      const err = (meta as Record<string, unknown>).error;
      if (typeof err === "string" && err.trim()) {
        return { message: err };
      }
    }
  }

  // 3) Fallbacks: top-level output as string or object with message/error
  if (status === "error") {
    const output = (part as { output?: unknown }).output;
    if (typeof output === "string" && output.trim()) {
      return { message: output };
    }
    if (output && typeof output === "object") {
      const outputObj = output as { message?: unknown; error?: unknown };
      const message =
        typeof outputObj.message === "string"
          ? outputObj.message
          : typeof outputObj.error === "string"
            ? outputObj.error
            : undefined;
      if (message) return { message };
    }
  }

  return {};
}

/**
 * Extract diff metadata from part
 */
export function extractDiffMetadata(part: Part): DiffMetadata | undefined {
  // Heuristics to detect diff/patch-like strings
  const looksLikeDiff = (s: string) =>
    /\bdiff --git\b/.test(s) ||
    /\n---\s/.test(s) ||
    /\n\+\+\+\s/.test(s) ||
    /\*\*\* Begin Patch/.test(s) ||
    /\*\*\* (Add|Update|Delete) File: /.test(s) ||
    /\n@@\s-\d+/.test(s);

  const pickString = (val: unknown): string | undefined =>
    typeof val === "string" && val.trim().length > 0 ? val : undefined;

  const tryFromObject = (obj: unknown): string | undefined => {
    if (!obj || typeof obj !== "object") return undefined;
    const rec = obj as Record<string, unknown>;
    const direct = pickString(rec.patch) || pickString(rec.diff) || pickString(rec.raw);
    if (direct && looksLikeDiff(direct)) return direct;
    // Some backends may wrap under data or result keys
    const nested =
      tryFromObject(rec.data) ||
      tryFromObject(rec.result) ||
      tryFromObject(rec.output) ||
      tryFromObject(rec.payload);
    if (nested && looksLikeDiff(nested)) return nested;
    return undefined;
  };

  // Try to get raw diff string from common locations in priority order
  const rawCandidates: Array<string | undefined> = [
    pickString((part as { diff?: unknown }).diff),
    pickString((part as { content?: unknown }).content),
    pickString((part as { text?: unknown }).text),
  ];

  // Inspect common container fields for diff text
  rawCandidates.push(
    (() => {
      const out = (part as { output?: unknown }).output;
      if (typeof out === "string") return out;
      return tryFromObject(out);
    })(),
  );
  rawCandidates.push(
    (() => {
      const res = (part as { result?: unknown }).result;
      if (typeof res === "string") return res;
      return tryFromObject(res);
    })(),
  );
  rawCandidates.push(
    (() => {
      const args = (part as { args?: unknown }).args;
      if (typeof args === "string") return args;
      return tryFromObject(args);
    })(),
  );
  rawCandidates.push(
    (() => {
      const meta = (part as { state?: { metadata?: unknown } }).state?.metadata;
      if (typeof meta === "string") return meta;
      return tryFromObject(meta);
    })(),
  );

  const rawDiff = rawCandidates.find((s): s is string => typeof s === "string" && looksLikeDiff(s));

  // Try to get files array
  const candidateFiles = (part as { files?: unknown }).files;
  const fileList = Array.isArray(candidateFiles)
    ? candidateFiles.map((file) => String(file)).filter(Boolean)
    : [];

  // If we have neither diff nor files, return undefined
  if (!rawDiff && fileList.length === 0) {
    return undefined;
  }

  // If we have a diff string, try to parse it
  if (rawDiff) {
    try {
      const parsed = parseDiff(rawDiff);
      return {
        raw: rawDiff,
        files:
          parsed.files.length > 0
            ? parsed.files.map((f) => f.newPath || f.oldPath)
            : fileList.length > 0
              ? fileList
              : extractDiffPaths(rawDiff),
        additions: parsed.totalAdditions,
        deletions: parsed.totalDeletions,
        hasParsedDiff: parsed.files.length > 0,
      };
    } catch {
      // If parsing fails, fall back to extracting paths
      return {
        raw: rawDiff,
        files: extractDiffPaths(rawDiff),
        hasParsedDiff: false,
      };
    }
  }

  // If we only have files list, return that
  if (fileList.length > 0) {
    return {
      files: fileList,
      hasParsedDiff: false,
    };
  }

  return undefined;
}

/**
 * Normalize a Part into ToolPartDetail structure
 */
export function normalizeToolPart(part: Part): ToolPartDetail {
  const status = normalizeToolStatus(part);
  const timings = extractTimings(part);
  const error = status === "error" ? extractError(part) : undefined;
  const diff = extractDiffMetadata(part);

  const rawState = (part as { state?: unknown }).state;
  const stateRecord =
    rawState && typeof rawState === "object"
      ? (rawState as Record<string, unknown>)
      : undefined;

  const rawMetadata =
    stateRecord && "metadata" in stateRecord
      ? (stateRecord["metadata"] as unknown)
      : undefined;
  const metadata =
    rawMetadata && typeof rawMetadata === "object"
      ? (rawMetadata as Record<string, unknown>)
      : undefined;

  const normalizedInput =
    (part as { input?: unknown }).input ??
    (stateRecord ? stateRecord["input"] : undefined);

  const metadataOutputCandidates = () => {
    if (!metadata) return undefined;
    const outputValue = metadata["output"];
    if (typeof outputValue === "string" && outputValue.length > 0) {
      return outputValue;
    }
    const stdoutValue = metadata["stdout"];
    if (typeof stdoutValue === "string" && stdoutValue.length > 0) {
      return stdoutValue;
    }
    if (Array.isArray(stdoutValue)) {
      return stdoutValue.join("\n");
    }
    const resultValue = metadata["result"];
    if (typeof resultValue === "string") {
      return resultValue;
    }
    return undefined;
  };

  const normalizedOutput =
    (part as { output?: unknown }).output ??
    (stateRecord ? stateRecord["output"] : undefined) ??
    metadataOutputCandidates();

  return {
    tool: extractToolName(part),
    status,
    input: normalizedInput,
    output: normalizedOutput,
    metadata,
    error,
    state:
      Object.keys(timings).length > 0
        ? {
            status: part.status,
            timings,
          }
        : undefined,
    path: extractFilePath(part),
    provider:
      "provider" in part && typeof part.provider === "string"
        ? part.provider
        : undefined,
    diff,
  };
}
