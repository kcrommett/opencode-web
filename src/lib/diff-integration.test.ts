import { describe, expect, it } from "bun:test";
import { normalizeToolPart, extractDiffMetadata } from "./tool-helpers";
import type { Part } from "@/types/opencode";

describe("Diff integration", () => {
  describe("extractDiffMetadata", () => {
    it("should extract diff from part.diff field", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        diff: `diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,2 +1,3 @@
 line 1
-old line
+new line
+added line`,
      };

      const metadata = extractDiffMetadata(part);
      expect(metadata).toBeDefined();
      expect(metadata?.raw).toBe(part.diff);
      expect(metadata?.files).toContain("test.txt");
      expect(metadata?.additions).toBe(2);
      expect(metadata?.deletions).toBe(1);
      expect(metadata?.hasParsedDiff).toBe(true);
    });

    it("should extract diff from part.content field as fallback", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        content: `diff --git a/file.ts b/file.ts
--- a/file.ts
+++ b/file.ts
@@ -1,1 +1,2 @@
 existing
+added`,
      };

      const metadata = extractDiffMetadata(part);
      expect(metadata).toBeDefined();
      expect(metadata?.raw).toBe(part.content);
      expect(metadata?.additions).toBe(1);
      expect(metadata?.deletions).toBe(0);
    });

    it("should extract diff from part.text when containing patch", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        text: `*** Begin Patch\n*** Update File: a.txt\n@@ -1,1 +1,1 @@\n-old\n+new\n*** End Patch`,
      } as any;

      const metadata = extractDiffMetadata(part);
      expect(metadata).toBeDefined();
      expect(metadata?.raw).toContain("*** Begin Patch");
      expect(metadata?.files).toContain("a.txt");
    });

    it("should extract diff from nested output.patch", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        // Simulate structured output with patch field
        output: {
          patch: `diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -1,1 +1,1 @@\n-old\n+new`,
        } as any,
      } as any;

      const metadata = extractDiffMetadata(part);
      expect(metadata).toBeDefined();
      expect(metadata?.raw).toContain("diff --git");
      expect(metadata?.files).toContain("x.ts");
    });

    it("should extract diff from state.metadata.diff", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        state: {
          status: "completed",
          input: {},
          output: "OK",
          title: "Edit file",
          time: { start: Date.now(), end: Date.now() },
          attachments: [],
          metadata: {
            diff: `diff --git a/r.txt b/r.txt\n--- a/r.txt\n+++ b/r.txt\n@@ -1,1 +1,1 @@\n-old\n+new`,
          },
        } as any,
      } as any;

      const metadata = extractDiffMetadata(part);
      expect(metadata).toBeDefined();
      expect(metadata?.files).toContain("r.txt");
      expect(metadata?.additions).toBe(1);
      expect(metadata?.deletions).toBe(1);
    });

    it("should extract files array when no diff string present", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        files: ["file1.ts", "file2.ts"],
      };

      const metadata = extractDiffMetadata(part as unknown as Part);
      expect(metadata).toBeDefined();
      expect(metadata?.files).toEqual(["file1.ts", "file2.ts"]);
      expect(metadata?.hasParsedDiff).toBe(false);
    });

    it("should return undefined when no diff data present", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
      };

      const metadata = extractDiffMetadata(part);
      expect(metadata).toBeUndefined();
    });

    it("should handle multi-file diffs", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        diff: `diff --git a/file1.txt b/file1.txt
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
-line 2`,
      };

      const metadata = extractDiffMetadata(part);
      expect(metadata).toBeDefined();
      expect(metadata?.files).toHaveLength(2);
      expect(metadata?.files).toContain("file1.txt");
      expect(metadata?.files).toContain("file2.txt");
      expect(metadata?.additions).toBe(1);
      expect(metadata?.deletions).toBe(1);
    });

    it("should handle new file creation", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        diff: `diff --git a/new.txt b/new.txt
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,2 @@
+line 1
+line 2`,
      };

      const metadata = extractDiffMetadata(part);
      expect(metadata).toBeDefined();
      expect(metadata?.files).toContain("new.txt");
      expect(metadata?.additions).toBe(2);
      expect(metadata?.deletions).toBe(0);
    });

    it("should handle file deletion", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        diff: `diff --git a/deleted.txt b/deleted.txt
--- a/deleted.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-line 1
-line 2`,
      };

      const metadata = extractDiffMetadata(part);
      expect(metadata).toBeDefined();
      expect(metadata?.files).toContain("deleted.txt");
      expect(metadata?.additions).toBe(0);
      expect(metadata?.deletions).toBe(2);
    });
  });

  describe("normalizeToolPart with diff", () => {
    it("should include diff metadata in normalized tool part", () => {
      const part: Part = {
        type: "tool",
        tool: "edit",
        status: "completed",
        diff: `diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,1 +1,2 @@
 line 1
+line 2`,
      };

      const normalized = normalizeToolPart(part);
      expect(normalized.diff).toBeDefined();
      expect(normalized.diff?.additions).toBe(1);
      expect(normalized.diff?.deletions).toBe(0);
      expect(normalized.tool).toBe("edit");
      expect(normalized.status).toBe("completed");
    });

    it("should not include diff when no diff data present", () => {
      const part: Part = {
        type: "tool",
        tool: "bash",
        status: "completed",
      };

      const normalized = normalizeToolPart(part);
      expect(normalized.diff).toBeUndefined();
    });
  });
});
