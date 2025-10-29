/**
 * Utilities for parsing and working with unified diff format
 */

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "context" | "add" | "remove";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

export interface ParsedDiff {
  files: DiffFile[];
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * Parse a unified diff string into structured data
 */
export function parseDiff(diffString: string): ParsedDiff {
  if (!diffString || diffString.trim().length === 0) {
    return { files: [], totalAdditions: 0, totalDeletions: 0 };
  }

  const lines = diffString.split("\n");
  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header: diff --git a/... b/...
    if (line.startsWith("diff --git")) {
      if (currentFile && currentHunk) {
        currentFile.hunks.push(currentHunk);
      }
      if (currentFile) {
        files.push(currentFile);
      }

      currentFile = {
        oldPath: "",
        newPath: "",
        hunks: [],
        additions: 0,
        deletions: 0,
        isBinary: false,
        isNew: false,
        isDeleted: false,
        isRenamed: false,
      };
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    // Old file path: --- a/...
    if (line.startsWith("---")) {
      const match = line.match(/^---\s+(?:a\/)?(.+)$/);
      if (match) {
        currentFile.oldPath = match[1] === "/dev/null" ? "" : match[1];
        if (match[1] === "/dev/null") {
          currentFile.isNew = true;
        }
      }
      continue;
    }

    // New file path: +++ b/...
    if (line.startsWith("+++")) {
      const match = line.match(/^\+\+\+\s+(?:b\/)?(.+)$/);
      if (match) {
        currentFile.newPath = match[1] === "/dev/null" ? "" : match[1];
        if (match[1] === "/dev/null") {
          currentFile.isDeleted = true;
        }
      }
      continue;
    }

    // Binary file indicator
    if (line.includes("Binary files")) {
      currentFile.isBinary = true;
      continue;
    }

    // Renamed file indicator
    if (line.startsWith("rename from") || line.startsWith("rename to")) {
      currentFile.isRenamed = true;
      continue;
    }

    // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    if (line.startsWith("@@")) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const oldStart = Number.parseInt(match[1], 10);
        const oldLines = match[2] ? Number.parseInt(match[2], 10) : 1;
        const newStart = Number.parseInt(match[3], 10);
        const newLines = match[4] ? Number.parseInt(match[4], 10) : 1;

        currentHunk = {
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: [],
        };

        oldLineNum = oldStart;
        newLineNum = newStart;
      }
      continue;
    }

    // Diff content lines
    if (currentHunk) {
      if (line.startsWith("+")) {
        currentHunk.lines.push({
          type: "add",
          content: line.slice(1),
          newLineNumber: newLineNum,
        });
        newLineNum++;
        currentFile.additions++;
      } else if (line.startsWith("-")) {
        currentHunk.lines.push({
          type: "remove",
          content: line.slice(1),
          oldLineNumber: oldLineNum,
        });
        oldLineNum++;
        currentFile.deletions++;
      } else if (line.startsWith(" ") || line === "") {
        currentHunk.lines.push({
          type: "context",
          content: line.slice(1),
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
        });
        oldLineNum++;
        newLineNum++;
      }
    }
  }

  // Push final hunk and file
  if (currentFile && currentHunk) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    files.push(currentFile);
  }

  // Calculate totals
  const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
  const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);

  return { files, totalAdditions, totalDeletions };
}

/**
 * Extract file paths from a diff string (fallback for unparseable diffs)
 */
export function extractDiffPaths(diffString: string): string[] {
  if (!diffString) return [];

  const paths = new Set<string>();
  const lines = diffString.split("\n");

  for (const line of lines) {
    // Match --- a/path or +++ b/path
    const unified = line.match(/^(?:---|\+\+\+)\s+(?:[ab]\/)?(.+)$/);
    if (unified && unified[1] !== "/dev/null") {
      paths.add(unified[1]);
      continue;
    }

    // Match Codex-style patch headers: *** Add/Update/Delete File: path
    const codex = line.match(/^\*\*\*\s+(?:Add|Update|Delete)\s+File:\s+(.+)$/);
    if (codex && codex[1]) {
      paths.add(codex[1]);
      continue;
    }
  }

  return Array.from(paths);
}

/**
 * Format diff statistics for display
 */
export function formatDiffStats(additions: number, deletions: number): string {
  const parts: string[] = [];
  if (additions > 0) {
    parts.push(`+${additions}`);
  }
  if (deletions > 0) {
    parts.push(`-${deletions}`);
  }
  return parts.join(", ") || "No changes";
}

/**
 * Check if a diff is too large to render (performance guard)
 */
export function isDiffTooLarge(
  diffString: string,
  maxSize: number = 250000,
): boolean {
  return diffString.length > maxSize;
}

/**
 * Truncate diff to a maximum size with a warning message
 */
export function truncateDiff(
  diffString: string,
  maxSize: number = 250000,
): { truncated: string; wasTruncated: boolean } {
  if (diffString.length <= maxSize) {
    return { truncated: diffString, wasTruncated: false };
  }

  const truncated = diffString.slice(0, maxSize);
  return {
    truncated: `${truncated}\n\n[... diff truncated at ${maxSize} characters ...]`,
    wasTruncated: true,
  };
}

/**
 * Generate unified diff from before/after content
 * Simple line-by-line diff suitable for rendering with diff2html
 */
export function generateUnifiedDiff(
  filepath: string,
  before: string,
  after: string,
): string {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  // Simple line-by-line comparison (not optimal but works for display)
  const hunks: string[] = [];
  let currentHunk: string[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;
  let hunkOldStart = 1;
  let hunkNewStart = 1;
  let hunkOldCount = 0;
  let hunkNewCount = 0;

  const maxLen = Math.max(beforeLines.length, afterLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < beforeLines.length ? beforeLines[i] : undefined;
    const newLine = i < afterLines.length ? afterLines[i] : undefined;

    if (oldLine === newLine && oldLine !== undefined) {
      // Context line
      if (currentHunk.length > 0) {
        currentHunk.push(` ${oldLine}`);
        hunkOldCount++;
        hunkNewCount++;
      }
      oldLineNum++;
      newLineNum++;
    } else {
      // Start new hunk if needed
      if (currentHunk.length === 0) {
        hunkOldStart = oldLineNum;
        hunkNewStart = newLineNum;
      }

      // Lines differ
      if (oldLine !== undefined) {
        currentHunk.push(`-${oldLine}`);
        hunkOldCount++;
        oldLineNum++;
      }
      if (newLine !== undefined) {
        currentHunk.push(`+${newLine}`);
        hunkNewCount++;
        newLineNum++;
      }
    }

    // Close hunk after collecting some changes
    if (currentHunk.length > 0 && (i === maxLen - 1 || (oldLine === newLine && currentHunk.length > 20))) {
      hunks.push(
        `@@ -${hunkOldStart},${hunkOldCount} +${hunkNewStart},${hunkNewCount} @@`
      );
      hunks.push(...currentHunk);
      currentHunk = [];
      hunkOldCount = 0;
      hunkNewCount = 0;
    }
  }

  // Build unified diff header
  const header = [
    `diff --git a/${filepath} b/${filepath}`,
    `--- a/${filepath}`,
    `+++ b/${filepath}`,
  ];

  return [...header, ...hunks].join("\n");
}
