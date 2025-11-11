## Config API (PATCH /config)

PATCH `/config` accepts a deep-partial update and returns the merged configuration along with metadata about where it was persisted.

### Request

- Method: `PATCH`
- Path: `/config`
- Query:
  - `directory?: string` – working directory (existing behavior)
  - `scope?: "project" | "global"` – default `project`
- Body: `Config.Patch` (deep-partial of `Config.Info`)
  - For validation, partials are accepted and validated after merge against the full `Config.Info` schema.

### Response (200)

```
{
  merged: Config.Info,
  diff?: {
    // boolean flags set for changed top-level sections
    provider?: true,
    mcp?: true,
    lsp?: true,
    watcher?: true,
    agent?: true,
    command?: true,
    formatter?: true,
    tools?: true,
    permission?: true,
    instructions?: true,
    share?: true,
    autoshare?: true,
    model?: true,
    small_model?: true,
    disabled_providers?: true,
    plugin?: true,
    theme?: true,
    // details
    pluginAdded?: string[],
    pluginRemoved?: string[],
    changedPaths?: string[],
  },
  scope?: "project" | "global",
  filepath: string
}
```

### Write Target Resolution

Project scope resolution (in order):
- Respect env overrides first
  - `OPENCODE_CONFIG` → write to that exact file
  - `OPENCODE_CONFIG_DIR` → prefer `opencode.jsonc`, then `opencode.json`; if none exist, create `opencode.jsonc`
  - `OPENCODE_CONFIG_CONTENT` → persistence is rejected (active config is in-memory)
- Otherwise prefer:
  - `./.opencode/opencode.jsonc`, `./.opencode/opencode.json`, `./opencode.jsonc`, `./opencode.json` (first existing; else create the first)

Global scope resolution:
- `~/.config/opencode/opencode.jsonc` (directories created if missing)

The effective target can be discovered via `Config.resolveWriteTarget(scope)` and enumerated via `Config.getSources()`.

### Events

After persistence, a `config.updated` event is published with payload (and the same event is also emitted by the config file watcher when files change on disk):

```
{
  scope: "project" | "global",
  directory?: string,
  filepath?: string,
  before: Config.Info,
  after: Config.Info,
  diff?: same shape as above (boolean top-level flags + details arrays)
}
```

Notes on delivery:
- Server publishes events after responding to PATCH, with a short debounce (~200ms) coalescing multiple rapid updates per `scope:filepath`.
- For `scope=global`, server fans out the event once per active directory.
- Config file watcher also publishes events with a short debounce (~250ms) when `opencode.jsonc|opencode.json` changes.

### Best Practices

- Use targeted invalidation (e.g., `State.invalidate("plugin")`) rather than full instance disposal.
- For `scope=global`, the event is published once per active directory context.
- Avoid logging secrets; logging the diff shape and paths is sufficient.

### Errors

- 400 Bad Request when:
  - `OPENCODE_CONFIG_CONTENT` is set (in-memory configuration cannot be persisted)
  - Invalid JSON/JSONC input or schema validation failure after merge
- 200 OK on successful merge + persist

### Notes

- JSONC comment preservation uses incremental edits for nested object paths; arrays are replaced atomically when changed. Full rewrite is used for new files or when necessary.
- Concurrency is protected by a process-local lock and atomic writes.
- Effective write targets can be inspected via `Config.getSources()` and `Config.resolveWriteTarget(scope)`.

## Examples

### Example 1 — Project scope update

Request:

```
PATCH /config?directory=/repo/app&scope=project
content-type: application/json

{
  "model": "anthropic/claude-3.7",
  "agent": {
    "build": { "temperature": 0.2 }
  }
}
```

Response:

```
200 OK
{
  "merged": {
    "$schema": "https://opencode.ai/config.json",
    "model": "anthropic/claude-3.7",
    "agent": { "build": { "temperature": 0.2 } }
    // ... other existing settings
  },
  "diff": { "model": true, "agent": true, "changedPaths": ["model", "agent"] },
  "scope": "project",
  "filepath": "/repo/app/.opencode/opencode.jsonc"
}
```

### Example 2 — Global update adding a plugin

Request:

```
PATCH /config?scope=global
content-type: application/json

{ "plugin": ["opencode-copilot-auth@0.0.4", "file:///Users/me/custom.mjs"] }
```

Response:

```
200 OK
{
  "merged": { "plugin": ["opencode-copilot-auth@0.0.4", "file:///Users/me/custom.mjs"] },
  "diff": { "plugin": true, "pluginAdded": ["file:///Users/me/custom.mjs"], "changedPaths": ["plugin"] },
  "scope": "global",
  "filepath": "/Users/me/.config/opencode/opencode.jsonc"
}
```

### Example 3 — Error when OPENCODE_CONFIG_CONTENT is set

If the process is started with `OPENCODE_CONFIG_CONTENT`, persistence is disabled. A PATCH returns 400:

```
400 Bad Request
{
  "name": "ConfigInvalidError",
  "data": { "path": "<inline>", "message": "cannot persist: OPENCODE_CONFIG_CONTENT is set" }
}
```

### Example 4 — SSE event for config.updated

Subscribing to `/event` streams Bus events. A config update emits:

```
event: message
data: {"type":"config.updated","properties":{
  "scope":"project",
  "directory":"/repo/app",
  "filepath":"/repo/app/.opencode/opencode.jsonc",
  "before": { /* previous config (abbreviated) */ },
  "after": { /* merged config (abbreviated) */ },
  "diff": { "theme": true, "changedPaths": ["theme"] }
}}
```

Note: The config file watcher emits the same event shape when it detects `opencode.jsonc|opencode.json` changes on disk.

### Example 5 — Subscribe with curl

```
curl -N "http://localhost:4096/event?directory=/repo/app"
```

You’ll see lines like:

```
event: message
data: {"type":"config.updated","properties":{...}}
```

### Example 6 — Subscribe with JavaScript

Browser (EventSource):

```js
const es = new EventSource("http://localhost:4096/event?directory=/repo/app");
es.onmessage = (ev) => {
  const evt = JSON.parse(ev.data);
  if (evt.type === "config.updated") {
    console.log("config changed:", evt.properties.diff);
  }
};
es.onerror = (err) => console.error("sse error", err);
```

Bun/Node (fetch streaming):

```js
const res = await fetch("http://localhost:4096/event?directory=/repo/app");
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  let idx;
  while ((idx = buf.indexOf("\n\n")) !== -1) {
    const chunk = buf.slice(0, idx);
    buf = buf.slice(idx + 2);
    const line = chunk.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const payload = JSON.parse(line.slice(5));
    if (payload.type === "config.updated") {
      console.log("config changed:", payload.properties.diff);
    }
  }
}
```
