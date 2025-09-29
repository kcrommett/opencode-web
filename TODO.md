# OpenCode Web Feature-Complete Implementation Todo List

## Phase 1: Foundation & Configuration
- [ ] Replace hard-coded baseUrl with env-driven configuration (NEXT_PUBLIC_OPENCODE_URL), add health-check bootstrapping via /app endpoint
- [ ] Wrap raw SDK client in typed abstraction layer with normalized success/error payloads and logging
- [ ] Create global OpenCodeProvider context for connection status, session/project caches, models, and async actions

## Phase 2: Realtime Messaging Pipeline
- [ ] Implement SSE streaming via client.event.subscribe() for token-by-token assistant message renders
- [ ] Extend message schema to carry tool execution metadata (command outputs, file diffs, shell logs)
- [ ] Add automatic backfill on reconnection (resume from last message ID, reload session state)

## Phase 3: Slash Command System
- [ ] Build command parser for leading tokens (/ ! @) and structured descriptors
- [ ] Map built-in TUI commands (/new, /undo, /redo, /share, etc.) to SDK calls
- [ ] Surface custom commands from .opencode/command/*.md via find.files with autocomplete
- [ ] Add immediate system messages for command results, errors, and progress

## Phase 4: Input Enhancements (@files, !shell, arguments)
- [ ] Trigger fuzzy file search on @ with find.files + debounce and preview
- [ ] Call file.read pre-flight for @path prompts and attach content as hidden part
- [ ] Support !command via session.shell with streamed output as tool message blocks
- [ ] Enable /command arg1 arg2 parsing with remainder passed to handler

## Phase 5: Session, Project, and Workspace Parity
- [ ] Expand Projects tab with real metadata (vcs type, last activity)
- [ ] Display session message counts, timestamps, share state with pinning
- [ ] Replace files placeholder with tree viewer using file.status and diff patches
- [ ] Leverage revert/redo APIs to refresh status indicators for file rollbacks

## Phase 6: UI & UX Refinements
- [ ] Split input into main editor + metadata bar (model selector, command badges)
- [ ] Introduce rich blocks for messages (markdown, syntax highlighting, collapsible tools)
- [ ] Add banners for connection/health, progress spinners, toast notifications
- [ ] Ensure responsive design collapses gracefully on mobile

## Phase 7: Observability, Error Handling, and Hardening
- [ ] Route SDK failures through handleOpencodeError with actionable messages
- [ ] Expose UI for auth.set and permission prompts
- [ ] Draft integration tests for command handling, SSE, shell execution

## Phase 8: Documentation & Rollout
- [ ] Update README.md/in-app help for slash commands, @ references, shell usage
- [ ] Add connect-to-server wizard with IP helper and fallbacks
- [ ] Outline deployment considerations (env vars, HTTPS, auth gating)