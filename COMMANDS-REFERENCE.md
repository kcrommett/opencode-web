# OpenCode Web - Commands Reference

**Last Updated:** 2025-10-03  
**Version:** 1.0

---

## Available Commands

### Session Management

#### `/new` or `/clear`
Creates a new session and clears the current workspace.
```
/new
```

#### `/sessions`
Opens the session picker dialog to switch between sessions.
```
/sessions
```

#### `/exit`
Clears all messages and resets the workspace.
```
/exit
```

---

### Model & Agent Selection

#### `/models`
Opens the model picker dialog.
```
/models
```

#### `/model <provider>/<model>`
Selects a specific model.
```
/model anthropic/claude-3-5-sonnet-20241022
```

#### `/agents`
Opens the agent picker dialog.
```
/agents
```

---

### File Operations

#### `/editor <file-path>`
Opens a file in the file viewer.
```
/editor src/app/index.tsx
```

---

### Session Control

#### `/undo`
Reverts the last assistant message and file changes.
```
/undo
```

#### `/redo`
Restores previously reverted changes.
```
/redo
```

#### `/share`
Generates a shareable URL for the current session (copies to clipboard).
```
/share
```

#### `/unshare`
Removes the share link from the current session.
```
/unshare
```

---

### Session Maintenance

#### `/init`
Initializes the project by creating/updating the AGENTS.md file.
```
/init
```

#### `/compact`
Compacts the session by summarizing messages to reduce token usage.
```
/compact
```

---

### Display Options

#### `/details`
Toggles visibility of detailed information (tool inputs, reasoning blocks).
```
/details
```

#### `/themes`
Opens the theme picker dialog.
```
/themes
```

---

### Export & Debug

#### `/export`
Exports the current session as a markdown file.
```
/export
```

#### `/debug`
Exports session data as JSON for debugging.
```
/debug
```

---

### Help

#### `/help`
Opens the help dialog with command information.
```
/help
```

---

## Shell Commands

Execute shell commands by prefixing with `$`:

```
$ ls -la
$ npm run build
$ git status
```

Shell commands are executed in the context of the current project directory and results are displayed in the chat.

---

## Regular Chat

Any message that doesn't start with `/` or `$` is sent as a regular chat message to the AI assistant:

```
How do I implement a React hook?
```

---

## Tips & Tricks

### Command Autocomplete
- Type `/` to see command suggestions
- Use arrow keys to navigate suggestions
- Press Enter or Tab to autocomplete

### File Search
- Use the search box in the Files tab
- Search results are clickable
- Click the ✕ button to close results

### Keyboard Shortcuts
- **Enter** - Send message
- **Shift+Enter** - New line in input
- **Escape** - Cancel dialogs

### Error Handling
All commands include error handling:
- Clear error messages
- No session required errors
- Validation for command arguments
- API failure notifications

---

## Examples

### Complete Workflow

```bash
# Create new session
/new

# Select a model
/model anthropic/claude-3-5-sonnet-20241022

# Initialize project
/init

# Send a message
How can I add authentication to my app?

# Execute shell command
$ npm install next-auth

# Open a file to review
/editor src/pages/api/auth/[...nextauth].ts

# Share session with team
/share

# Export session for documentation
/export

# Compact long conversation
/compact
```

### Undo Mistakes

```bash
# Made a mistake in previous response
/undo

# Change something and try again
Can you refactor this differently?

# Restore if needed
/redo
```

### Search and Edit

```bash
# Find a file (in Files tab)
[Search: "authentication"]

# Open the file
/editor src/lib/auth.ts

# Make changes via chat
Update the auth config to use JWT tokens
```

---

## Command Status

| Command | Status | Notes |
|---------|--------|-------|
| `/new` | ✅ | Working |
| `/clear` | ✅ | Alias for /new |
| `/sessions` | ✅ | Working |
| `/exit` | ✅ | Clears workspace |
| `/models` | ✅ | Working |
| `/model` | ✅ | Takes provider/model arg |
| `/agents` | ✅ | Working |
| `/editor` | ✅ | Takes file path arg |
| `/undo` | ✅ | Reverts last message |
| `/redo` | ✅ | Restores changes |
| `/share` | ✅ | Copies URL to clipboard |
| `/unshare` | ✅ | Removes share link |
| `/init` | ✅ | Creates AGENTS.md |
| `/compact` | ✅ | Summarizes session |
| `/details` | ✅ | Toggles detail view |
| `/themes` | ✅ | Working |
| `/export` | ✅ | Downloads .md file |
| `/debug` | ✅ | Exports JSON |
| `/help` | ✅ | Opens help dialog |
| `$ command` | ✅ | Shell execution |

**All commands fully implemented and tested!**

---

## Troubleshooting

### "No active session" Error
Some commands require an active session. Use `/new` to create one first.

### "Model not found" Error
Check available models with `/models` and use the exact format shown.

### Shell Command Failed
- Check command syntax
- Verify file paths
- Ensure permissions
- Review error message for details

### Share URL Not Working
- Ensure session has messages
- Check network connection
- Contact admin if problem persists

---

## Future Commands (Planned)

- `/search <query>` - Search messages in session
- `/rename <title>` - Rename current session
- `/delete` - Delete current session
- `/history` - Show command history
- `/repeat` - Repeat last command

---

**For more information, type `/help` in the application.**
