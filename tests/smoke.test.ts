import { describe, expect, it } from "bun:test";
import {
  detectLanguage,
  highlightCode,
  isImageFile,
  addLineNumbers,
} from "@/lib/highlight";

describe("highlight utilities", () => {
  describe("detectLanguage", () => {
    it("maps TypeScript files to typescript grammar", () => {
      expect(detectLanguage("/app/src/index.tsx")).toBe("typescript");
    });

    it("handles dotfiles with special cases", () => {
      expect(detectLanguage(".env")).toBe("bash");
      expect(detectLanguage(".gitignore")).toBe("plaintext");
    });

    it("defaults to plaintext for unknown extensions", () => {
      expect(detectLanguage("README.unknown")).toBe("plaintext");
    });
  });

  describe("highlightCode", () => {
    it("highlights known languages using highlight.js", () => {
      const output = highlightCode("const x = 1;", "typescript");
      expect(output).toContain("hljs-keyword");
      expect(output).toContain("const");
    });

    it("falls back to plaintext when language is missing", () => {
      const output = highlightCode("plain text", "unknown-language");
      expect(output).toBe("plain text");
    });
  });

  describe("isImageFile", () => {
    it("detects image extensions case-insensitively", () => {
      expect(isImageFile("/assets/logo.PNG")).toBe(true);
      expect(isImageFile("/assets/data.json")).toBe(false);
    });
  });

  describe("addLineNumbers", () => {
    it("prefixes each line with a span containing the line number", () => {
      const withNumbers = addLineNumbers("first\nsecond\nthird");
      const lines = withNumbers.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain('<span class="line-number">1</span>first');
      expect(lines[2]).toContain('<span class="line-number">3</span>third');
    });
  });
});
