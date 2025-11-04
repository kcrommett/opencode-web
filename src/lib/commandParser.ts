import type { Command } from "@/types/opencode";

export interface ParsedCommand {
  type: "slash" | "shell" | "file" | "plain";
  command?: string;
  args?: string[];
  filePath?: string;
  content?: string;
  matchedCommand?: Command;
  // New fields for shell enhancements
  multiline?: boolean;
  rawInput?: string;
  segments?: string[];
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
    
    // Check for multi-line commands (heredoc syntax or escaped newlines)
    const hasHeredoc = command.includes("<<") || command.includes("<<-");
    const hasEscapedNewlines = command.includes("\\\n");
    const hasMultipleLines = input.includes("\n") && input.trim().split("\n").length > 1;
    
    const multiline = hasHeredoc || hasEscapedNewlines || hasMultipleLines;
    
    // For multi-line commands, preserve the full input and split into segments
    if (multiline) {
      const segments = input.trim().split("\n").map(line => line.trim());
      return { 
        type: "shell", 
        command: command, // Full command including newlines
        content: input.trim(), // Preserve original whitespace for multi-line
        multiline: true,
        rawInput: input,
        segments
      };
    }
    
    return { type: "shell", command: command.trim(), content: trimmed };
  }

  if (trimmed.includes("@")) {
    const fileMatch = trimmed.match(/@([^\s]+)/);
    if (fileMatch) {
      return { type: "file", filePath: fileMatch[1], content: trimmed };
    }
  }

  return { type: "plain", content: trimmed };
}
