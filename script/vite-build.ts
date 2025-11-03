#!/usr/bin/env bun
/**
 * Wrapper script for `vite build` that filters out CSS @property warnings.
 *
 * Context:
 * - Tailwind CSS v4 uses Lightning CSS for optimization
 * - Lightning CSS doesn't recognize CSS Houdini @property rules yet
 * - These rules come from the @webtui/css library
 * - The warnings are harmless - @property rules work correctly in modern browsers
 *
 * This wrapper filters out the noise from build output while preserving all other
 * warnings, errors, and build information. The exit code is preserved.
 */

import { spawn } from "bun";

const env = { ...process.env };
if (process.platform === "win32" && !env.CSS_TRANSFORMER_WASM) {
  env.CSS_TRANSFORMER_WASM = "1";
}

const proc = spawn({
  cmd: ["vite", "build"],
  stdout: "pipe",
  stderr: "pipe",
  stdin: "inherit",
  env,
});

let buffer = "";
let inPropertyWarningBlock = false;
let skipNextFewLines = 0;

// Strip ANSI color codes for pattern matching
const stripAnsi = (str: string): string => {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
};

const filterLine = (line: string): boolean => {
  const clean = stripAnsi(line);

  // Skip lines if we're in a countdown
  if (skipNextFewLines > 0) {
    skipNextFewLines--;
    return false;
  }

  // Filter out the summary line about warnings
  if (
    clean.includes("Found") &&
    clean.includes("warnings") &&
    clean.includes("optimizing generated CSS")
  ) {
    inPropertyWarningBlock = true;
    return false;
  }

  // Filter out "Issue #N:" lines
  if (clean.match(/^Issue #\d+:$/)) {
    skipNextFewLines = 8; // Skip the next ~8 lines of the warning
    return false;
  }

  // Inside property warning block - filter lines with @property or related syntax
  if (inPropertyWarningBlock) {
    // Check if we're past the warning block (build output starts)
    if (
      clean.match(/^✓/) ||
      clean.includes("modules transformed") ||
      clean.includes("rendering chunks") ||
      clean.startsWith("vite v")
    ) {
      inPropertyWarningBlock = false;
      return true;
    }

    // Filter @property-related lines
    if (
      clean.includes("@property") ||
      clean.includes("syntax:") ||
      clean.includes("inherits:") ||
      clean.includes("initial-value:") ||
      clean.includes("Unknown at rule") ||
      clean.startsWith("│") ||
      clean.startsWith("┆") ||
      clean.trim() === ""
    ) {
      return false;
    }
  }

  return true;
};

const processStream = async (
  stream: ReadableStream,
  output: typeof Bun.stdout,
) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (filterLine(line)) {
        output.write(line + "\n");
      }
    }
  }

  // Process any remaining buffer
  if (buffer && filterLine(buffer)) {
    output.write(buffer + "\n");
  }
};

// Process both stdout and stderr
await Promise.all([
  processStream(proc.stdout, Bun.stdout),
  processStream(proc.stderr, Bun.stderr),
]);

const exitCode = await proc.exited;
process.exit(exitCode);
