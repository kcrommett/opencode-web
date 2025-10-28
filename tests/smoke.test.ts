import { describe, expect, it } from "bun:test";
import {
  detectLanguage,
  highlightCode,
  isImageFile,
  addLineNumbers,
} from "@/lib/highlight";
import { getOpencodeServerUrl } from "@/lib/opencode-config";
import { getCommandSuggestions, completeCommand, Command } from "@/lib/commands";

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

describe("opencode-config", () => {
  describe("getOpencodeServerUrl", () => {
    it("defaults to http://localhost:4096 when no env vars are set", () => {
      // Clear any existing env vars
      delete process.env.OPENCODE_SERVER_URL;
      delete process.env.VITE_OPENCODE_SERVER_URL;
      delete (globalThis as typeof globalThis & { __OPENCODE_SERVER_URL__?: string }).__OPENCODE_SERVER_URL__;
      expect(getOpencodeServerUrl()).toBe("http://localhost:4096");
    });

    it("respects VITE_OPENCODE_SERVER_URL", () => {
      process.env.VITE_OPENCODE_SERVER_URL = "https://example.com";
      expect(getOpencodeServerUrl()).toBe("https://example.com");
    });

    it("respects OPENCODE_SERVER_URL over VITE_OPENCODE_SERVER_URL", () => {
      process.env.OPENCODE_SERVER_URL = "https://override.com";
      process.env.VITE_OPENCODE_SERVER_URL = "https://example.com";
      expect(getOpencodeServerUrl()).toBe("https://override.com");
    });

    it("respects globalThis.__OPENCODE_SERVER_URL__", () => {
      delete process.env.OPENCODE_SERVER_URL;
      delete process.env.VITE_OPENCODE_SERVER_URL;
      (globalThis as typeof globalThis & { __OPENCODE_SERVER_URL__?: string }).__OPENCODE_SERVER_URL__ = "https://global.com";
      expect(getOpencodeServerUrl()).toBe("https://global.com");
    });
  });
});

describe("command suggestions", () => {
  describe("getCommandSuggestions", () => {
    it("prioritizes command name matches over description matches", () => {
      const suggestions = getCommandSuggestions("/ses");
      expect(suggestions[0].name).toBe("sessions");
    });

    it("handles exact command name matches", () => {
      const suggestions = getCommandSuggestions("/new");
      expect(suggestions[0].name).toBe("new");
      expect(suggestions.length).toBe(1);
    });

    it("returns description matches when no name matches exist", () => {
      // "session" (full word) should still prioritize /sessions first, then /new (description)
      const suggestions = getCommandSuggestions("/session");
      expect(suggestions[0].name).toBe("sessions");
      expect(suggestions.some((cmd) => cmd.name === "new")).toBe(true);
    });

    it("handles mixed-case input correctly", () => {
      const suggestions = getCommandSuggestions("/Ses");
      expect(suggestions[0].name).toBe("sessions");
    });

    it("returns all commands for empty query", () => {
      const suggestions = getCommandSuggestions("/");
      expect(suggestions.length).toBe(19);
    });

    it("returns empty array for non-command input", () => {
      const suggestions = getCommandSuggestions("not a command");
      expect(suggestions).toEqual([]);
    });

    it("does not return duplicate commands", () => {
      const suggestions = getCommandSuggestions("/s");
      const names = suggestions.map((cmd) => cmd.name);
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });

    it("handles custom commands with name priority", () => {
      const customCommands: Command[] = [
        {
          name: "custom-session",
          description: "Custom session command",
          category: "custom",
          custom: true,
        },
        {
          name: "test",
          description: "Contains session in description",
          category: "custom",
          custom: true,
        },
      ];
      const suggestions = getCommandSuggestions("/ses", customCommands);
      
      // Both custom-session and sessions should be name matches and come first
      const nameMatches = suggestions.filter((cmd) =>
        cmd.name.toLowerCase().startsWith("ses")
      );
      expect(nameMatches.length).toBeGreaterThan(0);
      
      // test should come after name matches (it only matches in description)
      const customSessionIndex = suggestions.findIndex(
        (cmd) => cmd.name === "custom-session"
      );
      const testIndex = suggestions.findIndex((cmd) => cmd.name === "test");
      expect(customSessionIndex).toBeLessThan(testIndex);
    });

    it("preserves category ordering within match groups", () => {
      // Get suggestions that should maintain their relative order
      const suggestions = getCommandSuggestions("/");
      const newIndex = suggestions.findIndex((cmd) => cmd.name === "new");
      const clearIndex = suggestions.findIndex((cmd) => cmd.name === "clear");
      const sessionsIndex = suggestions.findIndex((cmd) => cmd.name === "sessions");
      
      // These are all session category commands in the original order
      expect(newIndex).toBeLessThan(clearIndex);
      expect(clearIndex).toBeLessThan(sessionsIndex);
    });
  });

  describe("completeCommand", () => {
    it("completes unique prefix matches", () => {
      expect(completeCommand("/ses")).toBe("/sessions");
      expect(completeCommand("/se")).toBe("/sessions");
    });

    it("returns null for ambiguous matches", () => {
      expect(completeCommand("/s")).toBe(null);
    });

    it("returns null for non-command input", () => {
      expect(completeCommand("not a command")).toBe(null);
    });

    it("completes to common prefix for multiple matches", () => {
      // /mod matches both "model" and "models"
      // Common prefix is "model", which is longer than "mod"
      expect(completeCommand("/mod")).toBe("/model");
    });

    it("works with custom commands", () => {
      const customCommands: Command[] = [
        { name: "custom", description: "Custom command", category: "custom", custom: true },
      ];
      expect(completeCommand("/cus", customCommands)).toBe("/custom");
    });
  });
});
