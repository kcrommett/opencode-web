interface CommandDescriptor {
  type: 'slash' | 'shell' | 'file' | 'plain';
  command?: string;
  args?: string[];
  filePath?: string;
  content?: string;
}

export function parseCommand(input: string): CommandDescriptor {
  const trimmed = input.trim();

  if (trimmed.startsWith('/')) {
    const parts = trimmed.slice(1).split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    return { type: 'slash', command, args, content: trimmed };
  }

  if (trimmed.startsWith('!')) {
    const command = trimmed.slice(1);
    return { type: 'shell', command, content: trimmed };
  }

  if (trimmed.includes('@')) {
    // Simple file reference detection
    const fileMatch = trimmed.match(/@([^\s]+)/);
    if (fileMatch) {
      return { type: 'file', filePath: fileMatch[1], content: trimmed };
    }
  }

  return { type: 'plain', content: trimmed };
}
