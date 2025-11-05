import { afterEach, describe, expect, test } from "bun:test";
import type { Command } from "@/types/opencode";
import { parseCommand } from "./commandParser";
import { runCommand } from "./opencode-http-api";

describe("commandParser", () => {
  describe("shell command parsing", () => {
    test("should parse single-line shell command", () => {
      const input = "!ls -la";
      const result = parseCommand(input);
      
      expect(result.type).toBe("shell");
      expect(result.command).toBe("ls -la");
      expect(result.content).toBe("!ls -la");
      expect(result.multiline).toBeUndefined();
    });

    test("should parse multi-line shell command with heredoc", () => {
      const input = `!cat <<'EOF'
line 1
line 2
EOF`;
      const result = parseCommand(input);
      
      expect(result.type).toBe("shell");
      expect(result.command).toBe("cat <<'EOF'\nline 1\nline 2\nEOF");
      expect(result.content).toBe(input.trim());
      expect(result.multiline).toBe(true);
      expect(result.segments).toEqual([
        "!cat <<'EOF'",
        "line 1",
        "line 2",
        "EOF"
      ]);
    });

    test("should parse multi-line shell command with escaped newlines", () => {
      const input = `!echo \\
  "Hello \\
  World"`;
      const result = parseCommand(input);
      
      expect(result.type).toBe("shell");
      expect(result.command).toBe("echo \\\n  \"Hello \\\n  World\"");
      expect(result.multiline).toBe(true);
      expect(result.segments).toHaveLength(3);
    });

    test("should preserve raw input for multi-line commands", () => {
      const input = `!echo "Line 1"
echo "Line 2"
echo "Line 3"`;
      const result = parseCommand(input);
      
      expect(result.type).toBe("shell");
      expect(result.rawInput).toBe(input);
      expect(result.segments).toEqual([
        '!echo "Line 1"',
        'echo "Line 2"',
        'echo "Line 3"'
      ]);
    });

    test("should handle empty shell command", () => {
      const input = "!";
      const result = parseCommand(input);
      
      expect(result.type).toBe("shell");
      expect(result.command).toBe("");
      expect(result.content).toBe("!");
    });

    test("should handle shell command with only whitespace", () => {
      const input = "!   ";
      const result = parseCommand(input);
      
      expect(result.type).toBe("shell");
      expect(result.command).toBe("");
      expect(result.content).toBe("!");
    });
  });

  describe("slash command parsing", () => {
    test("should parse basic slash command", () => {
      const input = "/help";
      const result = parseCommand(input);
      
      expect(result.type).toBe("slash");
      expect(result.command).toBe("help");
      expect(result.args).toEqual([]);
    });

    test("should parse slash command with arguments", () => {
      const input = "/model gpt-4";
      const result = parseCommand(input);
      
      expect(result.type).toBe("slash");
      expect(result.command).toBe("model");
      expect(result.args).toEqual(["gpt-4"]);
    });

    test("should match available commands", () => {
      const availableCommands: Command[] = [
        {
          name: "help",
          description: "Show help",
          trigger: ["/help", "/h"]
        }
      ];
      
      const input = "/h";
      const result = parseCommand(input, availableCommands);
      
      expect(result.type).toBe("slash");
      expect(result.matchedCommand).toBeDefined();
      expect(result.matchedCommand?.name).toBe("help");
    });
  });

  describe("file command parsing", () => {
    test("should parse file reference", () => {
      const input = "Check @src/index.ts for errors";
      const result = parseCommand(input);
      
      expect(result.type).toBe("file");
      expect(result.filePath).toBe("src/index.ts");
      expect(result.content).toBe(input);
    });

    test("should fall back to plain text when no matches", () => {
      const input = "Nothing to see here";
      const result = parseCommand(input);
      
      expect(result.type).toBe("plain");
      expect(result.content).toBe(input);
    });
  });

  describe("plain text handling", () => {
    test("should treat regular text as plain", () => {
      const input = "Just a normal message";
      const result = parseCommand(input);
      
      expect(result.type).toBe("plain");
      expect(result.content).toBe(input);
    });

    test("should preserve whitespace in plain text", () => {
      const input = "   leading and trailing   ";
      const result = parseCommand(input);
      
      expect(result.type).toBe("plain");
      expect(result.content).toBe(input.trim());
    });

    test("should handle mixed content", () => {
      const input = "Check /help or !ls depending on needs";
      const result = parseCommand(input);
      
      expect(result.type).toBe("plain");
      expect(result.content).toBe(input);
    });

    test("should not treat slash in middle as command", () => {
      const input = "This is not /a command";
      const result = parseCommand(input);
      
      expect(result.type).toBe("plain");
      expect(result.content).toBe(input);
    });

    test("should not treat exclamation in middle as shell", () => {
      const input = "Hello! This is not a shell command";
      const result = parseCommand(input);
      
      expect(result.type).toBe("plain");
      expect(result.content).toBe(input);
    });
  });
});

describe("opencode-http-api runCommand", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const createMockResponse = () =>
    new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  test("includes directory in request body when provided", async () => {
    const recordedCalls: Array<Parameters<typeof fetch>> = [];

    globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
      recordedCalls.push(args);
      return Promise.resolve(createMockResponse());
    }) as typeof fetch;

    await runCommand("session-123", "ls", undefined, "/tmp/worktree");

    expect(recordedCalls).toHaveLength(1);
    const requestInit = recordedCalls[0]?.[1];
    expect(typeof requestInit?.body).toBe("string");
    const parsedBody = JSON.parse(requestInit?.body as string);
    expect(parsedBody).toEqual({
      command: "ls",
      directory: "/tmp/worktree",
    });
  });

  test("includes args array even when empty", async () => {
    const recordedCalls: Array<Parameters<typeof fetch>> = [];

    globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
      recordedCalls.push(args);
      return Promise.resolve(createMockResponse());
    }) as typeof fetch;

    await runCommand("session-abc", "ls", [], "/tmp/worktree");

    expect(recordedCalls).toHaveLength(1);
    const requestInit = recordedCalls[0]?.[1];
    expect(typeof requestInit?.body).toBe("string");
    const parsedBody = JSON.parse(requestInit?.body as string);
    expect(parsedBody).toEqual({
      command: "ls",
      args: [],
      directory: "/tmp/worktree",
    });
  });

  test("includes agent identifier when provided", async () => {
    const recordedCalls: Array<Parameters<typeof fetch>> = [];

    globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
      recordedCalls.push(args);
      return Promise.resolve(createMockResponse());
    }) as typeof fetch;

    await runCommand(
      "session-agent",
      "ls",
      [],
      "/tmp/worktree",
      "general",
    );

    expect(recordedCalls).toHaveLength(1);
    const requestInit = recordedCalls[0]?.[1];
    expect(typeof requestInit?.body).toBe("string");
    const parsedBody = JSON.parse(requestInit?.body as string);
    expect(parsedBody).toEqual({
      command: "ls",
      args: [],
      directory: "/tmp/worktree",
      agent: "general",
    });
  });
});
