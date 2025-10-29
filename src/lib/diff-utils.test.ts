import { describe, expect, it } from "bun:test";
import {
  parseDiff,
  extractDiffPaths,
  formatDiffStats,
  isDiffTooLarge,
  truncateDiff,
} from "./diff-utils";

describe("parseDiff", () => {
  it("should parse empty diff", () => {
    const result = parseDiff("");
    expect(result.files).toHaveLength(0);
    expect(result.totalAdditions).toBe(0);
    expect(result.totalDeletions).toBe(0);
  });

  it("should parse single file diff with additions and deletions", () => {
    const diff = `diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 context line 1
-removed line
+added line
+another added line
 context line 2`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].oldPath).toBe("test.txt");
    expect(result.files[0].newPath).toBe("test.txt");
    expect(result.files[0].additions).toBe(2);
    expect(result.files[0].deletions).toBe(1);
    expect(result.totalAdditions).toBe(2);
    expect(result.totalDeletions).toBe(1);
  });

  it("should parse multi-file diff", () => {
    const diff = `diff --git a/file1.txt b/file1.txt
--- a/file1.txt
+++ b/file1.txt
@@ -1,1 +1,2 @@
 line 1
+line 2
diff --git a/file2.txt b/file2.txt
--- a/file2.txt
+++ b/file2.txt
@@ -1,2 +1,1 @@
 line 1
-line 2`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].additions).toBe(1);
    expect(result.files[1].deletions).toBe(1);
    expect(result.totalAdditions).toBe(1);
    expect(result.totalDeletions).toBe(1);
  });

  it("should detect new file", () => {
    const diff = `diff --git a/new.txt b/new.txt
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,2 @@
+line 1
+line 2`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].isNew).toBe(true);
    expect(result.files[0].oldPath).toBe("");
    expect(result.files[0].additions).toBe(2);
  });

  it("should detect deleted file", () => {
    const diff = `diff --git a/deleted.txt b/deleted.txt
--- a/deleted.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-line 1
-line 2`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].isDeleted).toBe(true);
    expect(result.files[0].newPath).toBe("");
    expect(result.files[0].deletions).toBe(2);
  });

  it("should detect binary file", () => {
    const diff = `diff --git a/image.png b/image.png
Binary files a/image.png and b/image.png differ`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].isBinary).toBe(true);
  });

  it("should detect renamed file", () => {
    const diff = `diff --git a/old.txt b/new.txt
rename from old.txt
rename to new.txt`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].isRenamed).toBe(true);
  });

  it("should parse hunk with multiple hunks", () => {
    const diff = `diff --git a/file.txt b/file.txt
--- a/file.txt
+++ b/file.txt
@@ -1,2 +1,2 @@
-old line 1
+new line 1
 context line
@@ -10,2 +10,2 @@
-old line 10
+new line 10
 context line 10`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].hunks).toHaveLength(2);
    expect(result.files[0].hunks[0].oldStart).toBe(1);
    expect(result.files[0].hunks[1].oldStart).toBe(10);
  });
});

describe("extractDiffPaths", () => {
  it("should extract paths from diff headers", () => {
    const diff = `diff --git a/file1.txt b/file1.txt
--- a/file1.txt
+++ b/file1.txt
diff --git a/file2.txt b/file2.txt
--- a/file2.txt
+++ b/file2.txt`;

    const paths = extractDiffPaths(diff);
    expect(paths).toContain("file1.txt");
    expect(paths).toContain("file2.txt");
    expect(paths).toHaveLength(2);
  });

  it("should ignore /dev/null paths", () => {
    const diff = `diff --git a/new.txt b/new.txt
--- /dev/null
+++ b/new.txt`;

    const paths = extractDiffPaths(diff);
    expect(paths).toEqual(["new.txt"]);
  });

  it("should return empty array for empty diff", () => {
    const paths = extractDiffPaths("");
    expect(paths).toEqual([]);
  });

  it("should extract paths from Codex-style patch headers", () => {
    const diff = `*** Begin Patch
*** Update File: src/example.ts
@@ function foo()
-old
+new
*** Add File: src/new-file.ts
*** End Patch`;

    const paths = extractDiffPaths(diff);
    expect(paths).toContain("src/example.ts");
    expect(paths).toContain("src/new-file.ts");
  });
});

describe("formatDiffStats", () => {
  it("should format additions and deletions", () => {
    expect(formatDiffStats(5, 3)).toBe("+5, -3");
  });

  it("should format only additions", () => {
    expect(formatDiffStats(5, 0)).toBe("+5");
  });

  it("should format only deletions", () => {
    expect(formatDiffStats(0, 3)).toBe("-3");
  });

  it("should format no changes", () => {
    expect(formatDiffStats(0, 0)).toBe("No changes");
  });
});

describe("isDiffTooLarge", () => {
  it("should return false for small diffs", () => {
    const diff = "a".repeat(1000);
    expect(isDiffTooLarge(diff)).toBe(false);
  });

  it("should return true for large diffs", () => {
    const diff = "a".repeat(300000);
    expect(isDiffTooLarge(diff)).toBe(true);
  });

  it("should respect custom max size", () => {
    const diff = "a".repeat(1000);
    expect(isDiffTooLarge(diff, 500)).toBe(true);
  });
});

describe("truncateDiff", () => {
  it("should not truncate small diffs", () => {
    const diff = "small diff content";
    const result = truncateDiff(diff);
    expect(result.truncated).toBe(diff);
    expect(result.wasTruncated).toBe(false);
  });

  it("should truncate large diffs", () => {
    const diff = "a".repeat(300000);
    const result = truncateDiff(diff);
    expect(result.truncated.length).toBeLessThan(diff.length);
    expect(result.wasTruncated).toBe(true);
    expect(result.truncated).toContain("diff truncated");
  });

  it("should respect custom max size", () => {
    const diff = "a".repeat(1000);
    const result = truncateDiff(diff, 500);
    expect(result.truncated.length).toBeLessThan(diff.length);
    expect(result.wasTruncated).toBe(true);
  });
});
