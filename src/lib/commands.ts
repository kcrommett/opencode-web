export interface Command {
  name: string;
  description: string;
  args?: string;
  category: "session" | "model" | "theme" | "file" | "agent" | "other" | "custom";
  custom?: boolean;
}

export const COMMANDS: Command[] = [
  { name: "new", description: "Start a new session", category: "session" },
  { name: "clear", description: "Clear current session", category: "session" },
  { name: "sessions", description: "View all sessions", category: "session" },
  { name: "project", description: "Switch projects", category: "other" },
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
];

/**
 * Returns command suggestions prioritizing exact command name matches over description matches.
 * 
 * Priority order:
 * 1. Commands whose names start with the query (e.g., "/ses" -> "/sessions")
 * 2. Commands whose descriptions contain the query (e.g., "/session" -> "/new")
 * 
 * @param input - The user input string (e.g., "/ses")
 * @param customCommands - Optional custom commands to include in suggestions
 * @returns Array of matching commands, prioritized by name matches first
 */
export function getCommandSuggestions(input: string, customCommands: Command[] = []): Command[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return [];

  const query = trimmed.slice(1).toLowerCase();
  const allCommands = [...COMMANDS, ...customCommands];
  
  if (!query) return allCommands;

  // Two-pass filtering: prioritize name matches over description matches
  const nameMatches = allCommands.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(query)
  );

  const descriptionMatches = allCommands.filter((cmd) =>
    !cmd.name.toLowerCase().startsWith(query) &&
    cmd.description.toLowerCase().includes(query)
  );

  return [...nameMatches, ...descriptionMatches];
}

export function completeCommand(input: string, customCommands: Command[] = []): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const query = trimmed.slice(1).toLowerCase();
  const allCommands = [...COMMANDS, ...customCommands];
  const matches = allCommands.filter((cmd) =>
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
