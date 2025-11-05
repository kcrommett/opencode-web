# OpenCode Configuration Guide

This document provides a comprehensive overview of all available configuration options for OpenCode, including command-line flags, environment variables, and configuration file settings.

## Table of Contents

- [Command-Line Interface](#command-line-interface)
- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
- [Integration Configuration](#integration-configuration)
- [Advanced Configuration](#advanced-configuration)

## Command-Line Interface

### Global Options

These options are available for all `opencode` commands:

| Option          | Type    | Description                          |
| --------------- | ------- | ------------------------------------ |
| `--help, -h`    | boolean | Show help information                |
| `--version, -v` | boolean | Show version number                  |
| `--print-logs`  | boolean | Print logs to stderr                 |
| `--log-level`   | string  | Log level (DEBUG, INFO, WARN, ERROR) |

### Core Commands

#### `opencode run [message..]`

Run OpenCode with a message prompt.

| Option       | Alias | Type    | Description                              |
| ------------ | ----- | ------- | ---------------------------------------- |
| `--command`  |       | string  | The command to run, use message for args |
| `--continue` | `-c`  | boolean | Continue the last session                |
| `--session`  | `-s`  | string  | Session ID to continue                   |
| `--share`    |       | boolean | Share the session                        |
| `--model`    | `-m`  | string  | Model to use in format of provider/model |
| `--agent`    |       | string  | Agent to use                             |
| `--format`   |       | string  | Output format: default or json           |
| `--file`     | `-f`  | array   | File(s) to attach to message             |
| `--title`    |       | string  | Title for the session                    |

#### `opencode tui [project]`

Start the OpenCode terminal user interface.

| Option       | Alias | Type    | Default   | Description                              |
| ------------ | ----- | ------- | --------- | ---------------------------------------- |
| `--model`    | `-m`  | string  |           | Model to use in format of provider/model |
| `--continue` | `-c`  | boolean |           | Continue the last session                |
| `--session`  | `-s`  | string  |           | Session ID to continue                   |
| `--prompt`   | `-p`  | string  |           | Prompt to use                            |
| `--agent`    |       | string  |           | Agent to use                             |
| `--port`     |       | number  | 0         | Port to listen on                        |
| `--hostname` |       | string  | 127.0.0.1 | Hostname to listen on                    |

#### `opencode serve`

Start a headless OpenCode server.

| Option       | Alias | Type   | Default   | Description           |
| ------------ | ----- | ------ | --------- | --------------------- |
| `--port`     | `-p`  | number | 0         | Port to listen on     |
| `--hostname` |       | string | 127.0.0.1 | Hostname to listen on |

#### `opencode web`

Start the web interface.

| Option       | Alias | Type   | Default   | Description           |
| ------------ | ----- | ------ | --------- | --------------------- |
| `--port`     | `-p`  | number | 0         | Port to listen on     |
| `--hostname` |       | string | 127.0.0.1 | Hostname to listen on |

### Utility Commands

#### `opencode stats`

Show token usage and cost statistics.

| Option      | Type   | Description                                    |
| ----------- | ------ | ---------------------------------------------- |
| `--days`    | number | Show stats for last N days (default: all time) |
| `--tools`   | number | Number of tools to show (default: all)         |
| `--project` | string | Filter by project (default: all projects)      |

#### `opencode upgrade [target]`

Upgrade OpenCode to the latest or specific version.

| Option     | Alias | Type   | Description                                      |
| ---------- | ----- | ------ | ------------------------------------------------ |
| `--method` | `-m`  | string | Installation method (curl, npm, pnpm, bun, brew) |

#### `opencode export [sessionID]`

Export session data as JSON.

| Option      | Type   | Description                                        |
| ----------- | ------ | -------------------------------------------------- |
| `sessionID` | string | Session ID to export (interactive if not provided) |

#### `opencode models`

List all available models.

#### `opencode agent`

Manage agents.

| Subcommand | Description        |
| ---------- | ------------------ |
| `create`   | Create a new agent |

#### `opencode auth`

Manage credentials.

| Subcommand    | Alias | Description                        |
| ------------- | ----- | ---------------------------------- |
| `login [url]` |       | Log in to a provider               |
| `logout`      |       | Log out from a configured provider |
| `list`        | `ls`  | List providers                     |

### Integration Commands

#### `opencode github`

Manage GitHub agent.

| Subcommand | Description          |
| ---------- | -------------------- |
| `install`  | Install GitHub agent |
| `run`      | Run GitHub agent     |

#### `opencode mcp`

Manage MCP (Model Context Protocol) servers.

| Subcommand | Description       |
| ---------- | ----------------- |
| `add`      | Add an MCP server |

#### `opencode acp`

Start ACP (Agent Client Protocol) server.

| Option  | Type   | Default       | Description       |
| ------- | ------ | ------------- | ----------------- |
| `--cwd` | string | process.cwd() | Working directory |

### Debug Commands

#### `opencode debug`

Debug utilities for development.

| Subcommand | Description                |
| ---------- | -------------------------- |
| `config`   | Show current configuration |
| `lsp`      | LSP debugging utilities    |
| `rg`       | Ripgrep utilities          |
| `file`     | File system utilities      |
| `snapshot` | Snapshot utilities         |
| `paths`    | Show configuration paths   |

## Environment Variables

### Runtime Feature Flags

| Variable                              | Type    | Description                          |
| ------------------------------------- | ------- | ------------------------------------ |
| `OPENCODE_AUTO_SHARE`                 | boolean | Auto-share sessions                  |
| `OPENCODE_DISABLE_AUTOUPDATE`         | boolean | Disable automatic updates            |
| `OPENCODE_DISABLE_PRUNE`              | boolean | Disable session pruning              |
| `OPENCODE_DISABLE_DEFAULT_PLUGINS`    | boolean | Disable default plugins              |
| `OPENCODE_DISABLE_LSP_DOWNLOAD`       | boolean | Disable LSP server downloads         |
| `OPENCODE_ENABLE_EXPERIMENTAL_MODELS` | boolean | Enable experimental models           |
| `OPENCODE_DISABLE_AUTOCOMPACT`        | boolean | Disable automatic session compaction |
| `OPENCODE_EXPERIMENTAL_WATCHER`       | boolean | Enable experimental file watcher     |
| `OPENCODE_EXPERIMENTAL_TURN_SUMMARY`  | boolean | Enable experimental turn summaries   |
| `OPENCODE_EXPERIMENTAL_NO_BOOTSTRAP`  | boolean | Disable bootstrap process            |

### Configuration Overrides

| Variable                  | Type   | Description                            |
| ------------------------- | ------ | -------------------------------------- |
| `OPENCODE_CONFIG`         | string | Path to custom configuration file      |
| `OPENCODE_CONFIG_DIR`     | string | Path to custom configuration directory |
| `OPENCODE_CONFIG_CONTENT` | string | JSON configuration content             |
| `OPENCODE_PERMISSION`     | string | JSON permission configuration          |
| `OPENCODE_FAKE_VCS`       | string | Fake version control system            |

### Runtime Helpers

| Variable            | Type   | Description                               |
| ------------------- | ------ | ----------------------------------------- |
| `OPENCODE_ROUTE`    | string | Preset TUI routing                        |
| `OPENCODE_BIN_PATH` | string | Custom binary path for CLI discovery      |
| `OPENCODE_SERVER`   | string | Server URL for TUI connections            |
| `OPENCODE_API`      | string | Override API endpoint URL                 |
| `WAYLAND_DISPLAY`   | string | Wayland display for clipboard integration |
| `TMUX`              | string | Tmux session detection                    |
| `SHELL`             | string | Shell for bash tool (default: bash)       |
| `EDITOR`            | string | External editor for file editing          |
| `TERM_PROGRAM`      | string | Terminal program detection                |
| `GIT_ASKPASS`       | string | Git askpass program                       |
| `OPENCODE_CALLER`   | string | IDE caller detection                      |

### Provider Credentials

#### AWS Bedrock

| Variable                   | Type   | Default   | Description                  |
| -------------------------- | ------ | --------- | ---------------------------- |
| `AWS_PROFILE`              | string |           | AWS profile name             |
| `AWS_ACCESS_KEY_ID`        | string |           | AWS access key ID            |
| `AWS_BEARER_TOKEN_BEDROCK` | string |           | AWS bearer token for Bedrock |
| `AWS_REGION`               | string | us-east-1 | AWS region                   |

#### Google Vertex AI

| Variable                         | Type   | Default  | Description                          |
| -------------------------------- | ------ | -------- | ------------------------------------ |
| `GOOGLE_CLOUD_PROJECT`           | string |          | Google Cloud project ID              |
| `GCP_PROJECT`                    | string |          | Alternative to GOOGLE_CLOUD_PROJECT  |
| `GCLOUD_PROJECT`                 | string |          | Alternative to GOOGLE_CLOUD_PROJECT  |
| `GOOGLE_CLOUD_LOCATION`          | string | us-east5 | Google Cloud location                |
| `VERTEX_LOCATION`                | string | us-east5 | Alternative to GOOGLE_CLOUD_LOCATION |
| `GOOGLE_APPLICATION_CREDENTIALS` | string |          | Path to service account JSON         |

#### Documentation References

The docs also reference these Google Vertex variables:

- `GOOGLE_VERTEX_PROJECT`: Your Google Cloud project ID
- `GOOGLE_VERTEX_REGION`: The region for Vertex AI (defaults to `us-east5`)

### Installation & Distribution

| Variable               | Type   | Description                             |
| ---------------------- | ------ | --------------------------------------- |
| `OPENCODE_INSTALL_DIR` | string | Custom installation directory           |
| `XDG_BIN_DIR`          | string | XDG Base Directory compliant path       |
| `OPENCODE_CHANNEL`     | string | Release channel                         |
| `OPENCODE_VERSION`     | string | Override version                        |
| `OPENCODE_BUMP`        | string | Version bump type (major, minor, patch) |

### Development & Build

| Variable                | Type   | Description                      |
| ----------------------- | ------ | -------------------------------- |
| `GITHUB_TOKEN`          | string | GitHub token for publishing      |
| `POSTHOG_KEY`           | string | PostHog analytics key            |
| `CI`                    | string | Continuous integration detection |
| `npm_config_global`     | string | NPM global installation flag     |
| `npm_config_user_agent` | string | NPM user agent string            |

### Integration-Specific

#### GitHub Action

| Variable        | Type   | Description                           |
| --------------- | ------ | ------------------------------------- |
| `MODEL`         | string | Model to use (format: provider/model) |
| `SHARE`         | string | Share session (true/false)            |
| `GITHUB_RUN_ID` | string | GitHub Actions run ID                 |
| `TOKEN`         | string | GitHub personal access token          |
| `MOCK_EVENT`    | string | Mock GitHub event payload             |
| `MOCK_TOKEN`    | string | Mock GitHub token for testing         |

#### Slack Integration

| Variable               | Type   | Description          |
| ---------------------- | ------ | -------------------- |
| `SLACK_BOT_TOKEN`      | string | Bot User OAuth Token |
| `SLACK_SIGNING_SECRET` | string | Signing Secret       |
| `SLACK_APP_TOKEN`      | string | App-Level Token      |

#### Infrastructure

| Variable            | Type   | Description            |
| ------------------- | ------ | ---------------------- |
| `SST_STAGE`         | string | SST deployment stage   |
| `STRIPE_SECRET_KEY` | string | Stripe secret key      |
| `GOOGLE_CLIENT_ID`  | string | Google OAuth client ID |

## Configuration Files

### File Locations and Precedence

OpenCode loads configuration in this order:

1. Global configuration directory
2. Project-level `opencode.jsonc` or `opencode.json`
3. Custom config via `OPENCODE_CONFIG`
4. Custom config content via `OPENCODE_CONFIG_CONTENT`
5. `.opencode/` directory contents
6. Custom config directory via `OPENCODE_CONFIG_DIR`

### Main Configuration Schema

The main configuration file (`opencode.json` or `opencode.jsonc`) supports these options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "theme": "string",
  "share": "manual|auto|disabled",
  "autoupdate": true,
  "snapshot": true,
  "model": "provider/model",
  "small_model": "provider/model",
  "username": "string",
  "disabled_providers": ["provider1", "provider2"],
  "plugin": ["plugin1", "plugin2"],
  "instructions": ["file1.md", "file2.md"],
  "permission": {
    "edit": "ask|allow|deny",
    "bash": "ask|allow|deny",
    "webfetch": "ask|allow|deny"
  },
  "tools": {
    "bash": true,
    "read": true,
    "write": true,
    "edit": true,
    "glob": true,
    "grep": true,
    "list": true,
    "webfetch": true,
    "task": true,
    "todowrite": true,
    "todoread": true
  },
  "experimental": {
    "chatMaxRetries": 3,
    "disable_paste_summary": false,
    "hook": {
      "file_edited": [
        {
          "command": ["echo", "file edited"],
          "environment": { "VAR": "value" }
        }
      ],
      "session_completed": [
        {
          "command": ["echo", "session done"],
          "environment": { "VAR": "value" }
        }
      ]
    }
  }
}
```

### Agent Configuration

Agents are defined in `.opencode/agent/*.md` files with front matter:

```markdown
---
description: "When to use this agent"
mode: "primary|subagent|all"
model: "provider/model"
temperature: 0.7
top_p: 0.9
tools:
  bash: true
  read: true
  write: true
  edit: false
permission:
  edit: "ask"
  bash: "allow"
  webfetch: "ask"
---

Agent system prompt goes here...
```

### Command Configuration

Custom commands are defined in `.opencode/command/*.md` files:

```markdown
---
description: "Command description"
agent: "agent-name"
model: "provider/model"
subtask: false
---

Command template with {{variables}}
```

### MCP Configuration

MCP servers are configured in the main config:

```json
{
  "mcp": {
    "weather": {
      "type": "local",
      "command": ["bun", "x", "@h1deya/mcp-server-weather"],
      "environment": { "VAR": "value" },
      "enabled": true,
      "timeout": 5000
    },
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}"
      },
      "enabled": true,
      "timeout": 5000
    }
  }
}
```

### Provider Configuration

Custom providers and model overrides:

```json
{
  "provider": {
    "openai": {
      "api": "https://api.openai.com/v1",
      "models": {
        "gpt-4": {
          "name": "GPT-4",
          "cost": { "input": 0.03, "output": 0.06 },
          "limit": { "context": 8192, "output": 4096 }
        }
      },
      "options": {
        "apiKey": "sk-...",
        "timeout": 300000
      }
    }
  }
}
```

### LSP Configuration

Language Server Protocol configuration:

```json
{
  "lsp": {
    "typescript": {
      "command": ["typescript-language-server", "--stdio"],
      "extensions": [".ts", ".tsx", ".js", ".jsx"],
      "environment": { "NODE_ENV": "production" },
      "initialization": {
        "typescript": { "preferences": { "includeInlayParameterNameHints": "all" } }
      }
    },
    "python": {
      "disabled": true
    }
  }
}
```

### Keybind Configuration

Custom keybindings for the TUI:

```json
{
  "keybinds": {
    "leader": "ctrl+x",
    "app_exit": "ctrl+c,ctrl+d,<leader>q",
    "editor_open": "<leader>e",
    "theme_list": "<leader>t",
    "sidebar_toggle": "<leader>b",
    "status_view": "<leader>s",
    "session_new": "<leader>n",
    "session_list": "<leader>l",
    "session_share": "none",
    "session_unshare": "none",
    "session_compact": "<leader>c",
    "messages_copy": "<leader>y",
    "messages_undo": "<leader>u",
    "messages_redo": "<leader>r",
    "model_list": "<leader>m",
    "model_cycle_recent": "f2",
    "command_list": "ctrl+p",
    "agent_list": "<leader>a",
    "agent_cycle": "tab",
    "agent_cycle_reverse": "shift+tab",
    "input_clear": "ctrl+c",
    "input_submit": "return",
    "history_previous": "up",
    "history_next": "down"
  }
}
```

### TUI Configuration

Terminal user interface settings:

```json
{
  "tui": {
    "scroll_speed": 2
  }
}
```

## Integration Configuration

### GitHub Action

#### Action Inputs

| Input   | Type   | Description                                       |
| ------- | ------ | ------------------------------------------------- |
| `model` | string | Model to use (required)                           |
| `share` | string | Share session (defaults to true for public repos) |

#### Required Environment Variables

| Variable                                      | Description                           |
| --------------------------------------------- | ------------------------------------- |
| `MODEL`                                       | Model in format provider/model        |
| Provider API keys (e.g., `ANTHROPIC_API_KEY`) | Authentication for the selected model |

#### Example Workflow

```yaml
name: opencode

on:
  issue_comment:
    types: [created]

jobs:
  opencode:
    if: contains(github.event.comment.body, '/opencode')
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      pull-requests: read
      issues: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run opencode
        uses: sst/opencode/github@latest
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          model: anthropic/claude-sonnet-4-20250514
```

### Slack Integration

#### Required Environment Variables

| Variable               | Description                            |
| ---------------------- | -------------------------------------- |
| `SLACK_BOT_TOKEN`      | Bot User OAuth Token                   |
| `SLACK_SIGNING_SECRET` | Signing Secret from Basic Information  |
| `SLACK_APP_TOKEN`      | App-Level Token from Basic Information |

#### Setup Steps

1. Create a Slack app at https://api.slack.com/apps
2. Enable Socket Mode
3. Add OAuth scopes: `chat:write`, `app_mentions:read`, `channels:history`, `groups:history`
4. Install app to workspace
5. Set environment variables in `.env`

### Google Vertex AI Setup

#### Required Environment Variables

| Variable                                                                  | Description                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| `GOOGLE_VERTEX_PROJECT`                                                   | Your Google Cloud project ID                      |
| `GOOGLE_VERTEX_REGION`                                                    | The region for Vertex AI (defaults to `us-east5`) |
| Authentication (choose one):                                              |                                                   |
| `GOOGLE_APPLICATION_CREDENTIALS`                                          | Path to your service account JSON key file        |
| Or authenticate using gcloud CLI: `gcloud auth application-default login` |

#### Usage Examples

```bash
# Inline usage
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json GOOGLE_VERTEX_PROJECT=your-project-id opencode

# Shell profile
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GOOGLE_VERTEX_PROJECT=your-project-id
export GOOGLE_VERTEX_REGION=us-central1
```

## Advanced Configuration

### Installation Directory Priority

The install script respects this priority order:

1. `$OPENCODE_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory
4. `$HOME/.opencode/bin` - Default fallback

### Environment Variable Substitution

Configuration files support environment variable substitution:

- `{env:VAR_NAME}` - Substitutes with environment variable
- `{file:/path/to/file}` - Substitutes with file contents

### Experimental Features

Enable experimental features using environment variables:

- `OPENCODE_EXPERIMENTAL_WATCHER` - Experimental file watcher
- `OPENCODE_EXPERIMENTAL_TURN_SUMMARY` - Experimental turn summaries
- `OPENCODE_EXPERIMENTAL_NO_BOOTSTRAP` - Disable bootstrap process

### Debug Mode

Use debug commands for development:

```bash
opencode debug config          # Show current configuration
opencode debug lsp diagnostics  # LSP diagnostics
opencode debug rg search pattern  # Ripgrep search
opencode debug file read path   # File operations
```

### Configuration Validation

OpenCode validates configuration files using JSON Schema:

- Schema URL: `https://opencode.ai/config.json`
- Automatic schema addition to existing configs
- Detailed error reporting for invalid configurations

### Plugin Development

Plugins are loaded from:

- Global config directory `plugin/*.{ts,js}`
- Project `.opencode/plugin/*.{ts,js}`

Plugin structure follows the OpenCode plugin API specification.

## REST API Reference

OpenCode provides a comprehensive REST API for managing sessions, files, and various operations. The API is available when running `opencode serve` or through the TUI server.

### Base URL

```
http://localhost:4099
```

### Project Management

#### List Projects

```
GET /project
```

List all projects.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of Project objects

#### Get Current Project

```
GET /project/current
```

Get the current project information.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Project object

### Configuration

#### Get Configuration

```
GET /config
```

Get current configuration information.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Config object

#### Update Configuration

```
PATCH /config
```

Update configuration settings.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:** Config object

**Response:** Updated Config object

### Tool Management

#### List Tool IDs

```
GET /experimental/tool/ids
```

List all tool IDs including built-in and dynamically registered tools.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** ToolIDs object

#### List Tools

```
GET /experimental/tool
```

List tools with JSON schema parameters for a specific provider/model.

**Query Parameters:**

- `directory` (string, optional): Project directory path
- `provider` (string, required): Provider ID
- `model` (string, required): Model ID

**Response:** ToolList object

### Path Management

#### Get Current Path

```
GET /path
```

Get the current working path information.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Path object

### Session Management

#### List Sessions

```
GET /session
```

List all sessions.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of Session objects

#### Create Session

```
POST /session
```

Create a new session.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "parentID": "ses...",
  "title": "string"
}
```

**Response:** Session object

#### Get Session

```
GET /session/{id}
```

Get a specific session by ID.

**Path Parameters:**

- `id` (string, required): Session ID (pattern: ^ses.\*)

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Session object

#### Update Session

```
PATCH /session/{id}
```

Update session properties.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "title": "string"
}
```

**Response:** Updated Session object

#### Delete Session

```
DELETE /session/{id}
```

Delete a session and all its data.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** boolean

#### Get Session Children

```
GET /session/{id}/children
```

Get a session's child sessions.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of Session objects

#### Get Session Todo List

```
GET /session/{id}/todo
```

Get the todo list for a session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of Todo objects

#### Initialize Session

```
POST /session/{id}/init
```

Analyze the app and create an AGENTS.md file.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "modelID": "string",
  "providerID": "string",
  "messageID": "msg..."
}
```

**Response:** boolean

#### Fork Session

```
POST /session/{id}/fork
```

Fork an existing session at a specific message.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "messageID": "msg..."
}
```

**Response:** Session object

#### Abort Session

```
POST /session/{id}/abort
```

Abort a session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** boolean

#### Share Session

```
POST /session/{id}/share
```

Share a session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Session object

#### Unshare Session

```
DELETE /session/{id}/share
```

Unshare the session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Session object

#### Get Session Diff

```
GET /session/{id}/diff
```

Get the diff that resulted from a user message.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path
- `messageID` (string, optional): Message ID (pattern: ^msg.\*)

**Response:** Array of FileDiff objects

#### Summarize Session

```
POST /session/{id}/summarize
```

Summarize the session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "providerID": "string",
  "modelID": "string"
}
```

**Response:** boolean

### Message Management

#### List Messages

```
GET /session/{id}/message
```

List messages for a session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of Message objects

#### Send Message

```
POST /session/{id}/message
```

Create and send a new message to a session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "messageID": "msg...",
  "model": {
    "providerID": "string",
    "modelID": "string"
  },
  "agent": "string",
  "noReply": false,
  "system": "string",
  "tools": {
    "toolName": true
  },
  "parts": [
    {
      "type": "text",
      "text": "string"
    }
  ]
}
```

**Response:** AssistantMessage object

#### Get Message

```
GET /session/{id}/message/{messageID}
```

Get a specific message from a session.

**Path Parameters:**

- `id` (string, required): Session ID
- `messageID` (string, required): Message ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Message object

### Command Management

#### Send Command

```
POST /session/{id}/command
```

Send a new command to a session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "messageID": "msg...",
  "agent": "string",
  "model": "string",
  "arguments": "string",
  "command": "string"
}
```

**Response:** AssistantMessage object

#### List Commands

```
GET /command
```

List all available commands.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of Command objects

### Shell Operations

#### Run Shell Command

```
POST /session/{id}/shell
```

Run a shell command in a session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "agent": "string",
  "command": "string"
}
```

**Response:** AssistantMessage object

### Session Revert Operations

#### Revert Message

```
POST /session/{id}/revert
```

Revert a message in a session.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "messageID": "msg...",
  "partID": "prt..."
}
```

**Response:** Updated Session object

#### Restore Reverted Messages

```
POST /session/{id}/unrevert
```

Restore all reverted messages.

**Path Parameters:**

- `id` (string, required): Session ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Updated Session object

### Permission Management

#### Respond to Permission Request

```
POST /session/{id}/permissions/{permissionID}
```

Respond to a permission request.

**Path Parameters:**

- `id` (string, required): Session ID
- `permissionID` (string, required): Permission ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "response": "once|always|reject"
}
```

**Response:** boolean

### Provider Configuration

#### List Providers

```
GET /config/providers
```

List all available providers.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Provider list object

### File Operations

#### Find Text in Files

```
GET /find
```

Find text in files.

**Query Parameters:**

- `directory` (string, optional): Project directory path
- `pattern` (string, required): Search pattern

**Response:** Array of match objects

#### Find Files

```
GET /find/file
```

Find files by query.

**Query Parameters:**

- `directory` (string, optional): Project directory path
- `query` (string, required): Search query
- `dirs` (string, optional): Include directories (true/false)

**Response:** Array of file paths

#### Find Symbols

```
GET /find/symbol
```

Find workspace symbols.

**Query Parameters:**

- `directory` (string, optional): Project directory path
- `query` (string, required): Symbol query

**Response:** Array of Symbol objects

#### List Files

```
GET /file
```

List files and directories.

**Query Parameters:**

- `directory` (string, optional): Project directory path
- `path` (string, required): File path

**Response:** Array of FileNode objects

#### Read File

```
GET /file/content
```

Read a file's content.

**Query Parameters:**

- `directory` (string, optional): Project directory path
- `path` (string, required): File path

**Response:** FileContent object

#### Get File Status

```
GET /file/status
```

Get file status information.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of File objects

### Authentication

#### Set Authentication

```
PUT /auth/{id}
```

Set authentication credentials.

**Path Parameters:**

- `id` (string, required): Authentication ID

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:** Auth object

**Response:** boolean

### Logging

#### Write Log Entry

```
POST /log
```

Write a log entry to the server logs.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "service": "string",
  "level": "debug|info|error|warn",
  "message": "string",
  "extra": {}
}
```

**Response:** boolean

### Agent Management

#### List Agents

```
GET /agent
```

List all available agents.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of Agent objects

### Server Status

#### Get MCP Server Status

```
GET /mcp
```

Get MCP (Model Context Protocol) server status.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** MCP server status object

#### Get LSP Server Status

```
GET /lsp
```

Get LSP (Language Server Protocol) server status.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of LSPStatus objects

#### Get Formatter Status

```
GET /formatter
```

Get formatter status.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Array of FormatterStatus objects

### TUI Operations

#### Append Prompt to TUI

```
POST /tui/append-prompt
```

Append prompt to the TUI.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "text": "string"
}
```

**Response:** boolean

#### Open Help Dialog

```
POST /tui/open-help
```

Open the help dialog in TUI.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** boolean

#### Open Sessions Dialog

```
POST /tui/open-sessions
```

Open the session dialog in TUI.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** boolean

#### Open Themes Dialog

```
POST /tui/open-themes
```

Open the theme dialog in TUI.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** boolean

#### Open Models Dialog

```
POST /tui/open-models
```

Open the model dialog in TUI.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** boolean

#### Submit Prompt

```
POST /tui/submit-prompt
```

Submit the prompt in TUI.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** boolean

#### Clear Prompt

```
POST /tui/clear-prompt
```

Clear the prompt in TUI.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** boolean

#### Execute TUI Command

```
POST /tui/execute-command
```

Execute a TUI command (e.g. agent_cycle).

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "command": "string"
}
```

**Response:** boolean

#### Show Toast Notification

```
POST /tui/show-toast
```

Show a toast notification in the TUI.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:**

```json
{
  "title": "string",
  "message": "string",
  "variant": "info|success|warning|error",
  "duration": 5000
}
```

**Response:** boolean

#### Publish TUI Event

```
POST /tui/publish
```

Publish a TUI event.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:** TUI event object

**Response:** boolean

#### Get Next TUI Request

```
GET /tui/control/next
```

Get the next TUI request from the queue.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** TUI request object

#### Submit TUI Response

```
POST /tui/control/response
```

Submit a response to the TUI request queue.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Request Body:** Response object

**Response:** boolean

### Event Streaming

#### Subscribe to Events

```
GET /event
```

Get real-time events from the server.

**Query Parameters:**

- `directory` (string, optional): Project directory path

**Response:** Server-Sent Events stream

---

For more detailed information on specific features, visit the [OpenCode Documentation](https://opencode.ai/docs).
