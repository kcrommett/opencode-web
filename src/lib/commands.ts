export interface Command {
  name: string;
  description: string;
  args?: string;
  category: "session" | "model" | "theme" | "file" | "agent" | "other";
}

export const COMMANDS: Command[] = [
  { name: "new", description: "Start a new session", category: "session" },
  { name: "clear", description: "Clear current session", category: "session" },
  { name: "sessions", description: "View all sessions", category: "session" },
  { name: "models", description: "Open model picker", category: "model" },
  {
    name: "model",
    description: "Select a specific model",
    args: "<provider>/<model>",
    category: "model",
  },
  { name: "agents", description: "Cycle through agents", category: "agent" },
  { name: "themes", description: "Open theme picker", category: "theme" },
  { name: "help", description: "Show help dialog", category: "other" },
  { name: "undo", description: "Undo last file changes", category: "file" },
  { name: "redo", description: "Redo last undone changes", category: "file" },
  { name: "share", description: "Share current session", category: "other" },
  { name: "unshare", description: "Unshare session", category: "other" },
  { name: "init", description: "Initialize project", category: "other" },
  { name: "compact", description: "Toggle compact view", category: "other" },
  { name: "details", description: "Toggle details view", category: "other" },
  { name: "export", description: "Export session", category: "other" },
  {
    name: "debug",
    description: "Export session data (JSON)",
    category: "other",
  },
  { name: "editor", description: "Open editor", category: "other" },
  { name: "exit", description: "Exit application", category: "other" },
];

export function getCommandSuggestions(input: string): Command[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return [];

  const query = trimmed.slice(1).toLowerCase();
  if (!query) return COMMANDS;

  return COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().startsWith(query) ||
      cmd.description.toLowerCase().includes(query),
  );
}

export function completeCommand(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const query = trimmed.slice(1).toLowerCase();
  const matches = COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(query),
  );

  if (matches.length === 1) {
    return `/${matches[0].name}`;
  }

  if (matches.length > 1) {
    const commonPrefix = getCommonPrefix(matches.map((m) => m.name));
    if (commonPrefix.length > query.length) {
      return `/${commonPrefix}`;
    }
  }

  return null;
}

function getCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  if (strings.length === 1) return strings[0];

  let prefix = "";
  const first = strings[0].toLowerCase();

  for (let i = 0; i < first.length; i++) {
    const char = first[i];
    if (strings.every((s) => s.toLowerCase()[i] === char)) {
      prefix += strings[0][i];
    } else {
      break;
    }
  }

  return prefix;
}
