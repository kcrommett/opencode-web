import type { Command } from "@/types/opencode";

export interface ParsedCommand {
  type: "slash" | "shell" | "file" | "plain";
  command?: string;
  args?: string[];
  filePath?: string;
  content?: string;
  matchedCommand?: Command;
}

export function parseCommand(
  input: string,
  availableCommands: Command[] = [],
): ParsedCommand {
  const trimmed = input.trim();

  if (trimmed.startsWith("/")) {
    const parts = trimmed.slice(1).split(" ");
    const cmdName = parts[0];
    const args = parts.slice(1);

    const matchedCommand = availableCommands.find(
      (cmd) =>
        cmd.trigger?.includes(`/${cmdName}`) ||
        cmd.name === cmdName,
    );

    return {
      type: "slash",
      command: cmdName,
      args,
      content: trimmed,
      matchedCommand,
    };
  }

  if (trimmed.startsWith("!")) {
    const command = trimmed.slice(1);
    return { type: "shell", command, content: trimmed };
  }

  if (trimmed.includes("@")) {
    const fileMatch = trimmed.match(/@([^\s]+)/);
    if (fileMatch) {
      return { type: "file", filePath: fileMatch[1], content: trimmed };
    }
  }

  return { type: "plain", content: trimmed };
}
