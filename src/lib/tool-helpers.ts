import type { Part, ToolPartDetail } from "@/types/opencode";

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

/**
 * Extract file path from tool part (from args or direct path field)
 */
export function extractFilePath(part: Part): string | undefined {
  // Direct path field
  if (typeof part.path === "string" && part.path.length > 0) {
    return part.path;
  }

  // Check args for common path fields
  if (part.args && typeof part.args === "object") {
    const pathFields = ["filePath", "path", "file", "filename"];
    for (const field of pathFields) {
      const value = part.args[field];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
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
  // Check for error field
  const error = (part as { error?: unknown }).error;
  if (error && typeof error === "object") {
    const errorObj = error as { message?: unknown; stack?: unknown };
    return {
      message:
        typeof errorObj.message === "string" ? errorObj.message : undefined,
      stack: typeof errorObj.stack === "string" ? errorObj.stack : undefined,
    };
  }

  // Check output for error info when status is error
  const status = normalizeToolStatus(part);
  if (status === "error") {
    const output = (part as { output?: unknown }).output;
    if (typeof output === "string") {
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
      return { message };
    }
  }

  return {};
}

/**
 * Normalize a Part into ToolPartDetail structure
 */
export function normalizeToolPart(part: Part): ToolPartDetail {
  const status = normalizeToolStatus(part);
  const timings = extractTimings(part);
  const error = status === "error" ? extractError(part) : undefined;

  return {
    tool: extractToolName(part),
    status,
    input: (part as { input?: unknown }).input,
    output: (part as { output?: unknown }).output,
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
  };
}
