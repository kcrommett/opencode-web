import { describe, it, expect } from "bun:test";
import { hasMarkdownSyntax } from "../src/lib/markdown";

describe("Markdown Detection", () => {
  it("should detect headings", () => {
    expect(hasMarkdownSyntax("# Heading 1")).toBe(true);
    expect(hasMarkdownSyntax("## Heading 2")).toBe(true);
    expect(hasMarkdownSyntax("### Heading 3")).toBe(true);
  });

  it("should detect bold text", () => {
    expect(hasMarkdownSyntax("**bold text**")).toBe(true);
    expect(hasMarkdownSyntax("This is **bold**")).toBe(true);
  });

  it("should detect italic text", () => {
    expect(hasMarkdownSyntax("*italic text*")).toBe(true);
    expect(hasMarkdownSyntax("This is *italic*")).toBe(true);
  });

  it("should detect links", () => {
    expect(hasMarkdownSyntax("[link](https://example.com)")).toBe(true);
    expect(hasMarkdownSyntax("Check [this](url) out")).toBe(true);
  });

  it("should detect code blocks", () => {
    expect(hasMarkdownSyntax("```javascript\ncode\n```")).toBe(true);
    expect(hasMarkdownSyntax("```\ncode\n```")).toBe(true);
  });

  it("should detect inline code", () => {
    expect(hasMarkdownSyntax("`inline code`")).toBe(true);
    expect(hasMarkdownSyntax("Use `this` variable")).toBe(true);
  });

  it("should detect unordered lists", () => {
    expect(hasMarkdownSyntax("- item 1\n- item 2")).toBe(true);
    expect(hasMarkdownSyntax("* item 1\n* item 2")).toBe(true);
    expect(hasMarkdownSyntax("+ item 1\n+ item 2")).toBe(true);
  });

  it("should detect ordered lists", () => {
    expect(hasMarkdownSyntax("1. item 1\n2. item 2")).toBe(true);
    expect(hasMarkdownSyntax("10. item ten")).toBe(true);
  });

  it("should detect blockquotes", () => {
    expect(hasMarkdownSyntax("> quote")).toBe(true);
    expect(hasMarkdownSyntax("> This is a quote\n> on multiple lines")).toBe(true);
  });

  it("should detect tables", () => {
    expect(hasMarkdownSyntax("| col1 | col2 |\n|------|------|")).toBe(true);
    expect(hasMarkdownSyntax("| header | value |")).toBe(true);
  });

  it("should not detect plain text as markdown", () => {
    expect(hasMarkdownSyntax("This is plain text")).toBe(false);
    expect(hasMarkdownSyntax("No markdown here")).toBe(false);
    expect(hasMarkdownSyntax("Just regular words")).toBe(false);
  });

  it("should handle empty strings", () => {
    expect(hasMarkdownSyntax("")).toBe(false);
  });

  it("should handle mixed content", () => {
    const mixed = `
      # Title
      This is a paragraph with **bold** and *italic* text.
      
      - List item 1
      - List item 2
      
      \`\`\`javascript
      const code = true;
      \`\`\`
    `;
    expect(hasMarkdownSyntax(mixed)).toBe(true);
  });
});
