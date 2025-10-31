import { describe, it, expect } from "bun:test";

/**
 * Code block component tests - structural and export validation.
 * Full DOM rendering tests are handled through manual browser QA.
 */

describe("CodeBlock Component Structure", () => {
  it("should export MarkdownRenderer", async () => {
    const { MarkdownRenderer } = await import("../src/lib/markdown");
    expect(MarkdownRenderer).toBeDefined();
    expect(typeof MarkdownRenderer).toBe("function");
  });

  it("should export hasMarkdownSyntax helper", async () => {
    const { hasMarkdownSyntax } = await import("../src/lib/markdown");
    expect(hasMarkdownSyntax).toBeDefined();
    expect(typeof hasMarkdownSyntax).toBe("function");
  });

  it("should detect code blocks in markdown", async () => {
    const { hasMarkdownSyntax } = await import("../src/lib/markdown");
    expect(hasMarkdownSyntax("```javascript\ncode\n```")).toBe(true);
    expect(hasMarkdownSyntax("```\ncode\n```")).toBe(true);
  });
});
