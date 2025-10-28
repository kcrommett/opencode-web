# Sidebar Status & Context Enhancement Plan

**Issue:** [#49 - Enhance sidebar with session context, MCP/LSP status, and modified files](https://github.com/kcrommett/opencode-web/issues/49)  
**Date:** 2025-10-28  
**Status:** Draft – Ready for Implementation  
**Owner:** OpenCode Web team

---

## Context & Decisions
### Conversation Summary
- 2025-10-28: Maintainer requested a comprehensive, execution-ready plan for issue #49; this document captures all decisions from that conversation and the repository analysis performed here.
- No implementation work has started yet on this branch; the plan establishes scope, sequencing, and validation so the engineering team can proceed without re-gathering context.

### Issue Synopsis
- Replace the current single-panel sidebar with a tabbed interface that maintains existing project and session management features.
- Add dedicated panels for: Session Context (model, agent, counts, duration), MCP server status, LSP diagnostics summaries, and Modified Files (git status).
- Ensure all panels update in real time via SSE events, with fallbacks where necessary.
- Persist sidebar width and implement a resizable experience that remains responsive on mobile devices.

### Existing Implementation Notes
- `src/app/index.tsx` currently renders the sidebar, handles width persistence (`opencode-sidebar-width`), and surfaces `filteredSessions`, project switching, and file browsing logic (`sidebarWidth` around lines 515 & 2670).
- `src/app/_components/ui/mobile-sidebar.tsx` provides the mobile drawer that must stay in sync with the desktop sidebar.
- `src/app/_components/ui/status-badge.tsx` and other UI primitives already exist for consistent status indicators.
- `src/hooks/useOpenCode.ts` manages SSE subscriptions and exposes session, project, file, and usage state; diagnostics-specific handling is currently a no-op.
- `src/lib/opencode-client.ts` includes `getFileStatus()` and SSE subscription helpers but lacks MCP-specific helpers; server function wrappers live in `src/lib/opencode-server-fns.ts`.
- Context documentation for SSE (`CONTEXT/SSE-EVENTS-DOCUMENTATION.md`) and HTTP APIs (`CONTEXT/API-ENDPOINTS-DOCUMENTATION.md`) define the upstream contracts we must honor.

### Constraints & Rationale
- Preserve current workspace and session management UX while overlaying new status panels; project/session lists should remain accessible in the default tab.
- Lean on existing SSE infrastructure so updates appear without manual refresh; introduce lightweight polling fallbacks for APIs without SSE coverage (e.g., `/mcp`).
- Reuse shared UI primitives (Badge, StatusBadge, Separator, Spinner) and avoid adding heavyweight dependencies.
- Keep mobile parity by updating both desktop and drawer experiences, respecting current theming and keyboard navigation patterns.
- Follow OpenCode Web guidelines: TypeScript-first, minimal state duplication, guard logging in development only, and use Bun tooling for validation.

---

## Objectives & Success Metrics
- Deliver a tabbed sidebar that surfaces real-time session, MCP, LSP, and git insights without regressing existing capabilities.
- Maintain <1s perceived latency for status updates after SSE events or polling responses.
- Ensure new state is fully typed and exposed through `useOpenCode` + `OpenCodeContext` for reuse.
- Keep UX accessible (keyboard/tab focus, ARIA labels) and responsive across breakpoints.
- Achieve green runs for `bun run lint`, `bun x tsc --noEmit`, and relevant smoke tests.

---

## Technical Specifications
### Data Sources & Endpoints
| Area | Endpoint / Source | Purpose | Notes |
| --- | --- | --- | --- |
| Session baseline | `GET /session` | Seed session list, message counts | Already consumed in `src/hooks/useOpenCode.ts` via `openCodeService.getSessions()` |
| Session updates | `session.updated` (SSE) | Refresh session metadata (title, activity) | Handler exists; extend to derive duration and message counts |
| Session resource usage | `sessionUsage` state (OpenCode) | Provide token counts & durations | Aggregated in `useOpenCode`, currently used for token stats |
| MCP status | `GET /mcp` | Enumerate MCP servers, connection status | New client + server fn wrappers required |
| MCP events | *(none)* | No SSE coverage; add 5s polling fallback | Cache responses to limit churn |
| LSP diagnostics | `lsp.client.diagnostics` (SSE) | Identify server IDs & affected paths | Need aggregation to severity counts; confirm payload structure via logging |
| Git status | `GET /file/status` | Report modified, staged, untracked files | Already exposed via `openCodeService.getFileStatus()` |
| File watcher | `file.watcher.updated` (SSE) | Trigger incremental git status refresh | Filter events by directory/project |
| Agent & model meta | `currentAgent`, `sessionUsage`, `currentSession` (context) | Populate session context panel | Derived from `useOpenCode` exports |

### SSE Event Handling Plan
| Event | Payload Highlights | Consumption Strategy |
| --- | --- | --- |
| `session.updated` | `properties.info` with session metadata | Update session context cache for active session + session list tab |
| `session.error` | Error info, `sessionID` | Surface warnings in Session Context panel and StatusBadge |
| `message.updated` | Message info + token stats | Increment message counts and recompute duration where needed |
| `file.watcher.updated` | `{ file, event }` | Debounce git status refresh; highlight affected files |
| `lsp.client.diagnostics` | `{ path, serverID, ... }` | Aggregate counts per server + severity (inspect payload) |
| `server.connected` / disconnect hooks | Connection state | Show SSE connection heartbeat indicator in Session Context |

### Data Models
```typescript
interface SidebarStatusState {
  sessionContext: {
    id: string;
    title?: string;
    agentName?: string;
    modelId?: string;
    messageCount: number;
    activeSince?: Date;
    lastActivity?: Date;
    tokenUsage?: SessionUsageTotals;
    isStreaming: boolean;
    lastError?: string | null;
  };
  mcpServers: Array<{
    id: string;
    name: string;
    status: "connected" | "connecting" | "disconnected" | "error";
    lastChecked: Date;
    description?: string;
  }>;
  lspDiagnostics: Record<
    string,
    {
      label: string;
      errors: number;
      warnings: number;
      infos: number;
      hints: number;
      lastPath?: string;
      updatedAt: Date;
    }
  >;
  gitStatus: {
    branch?: string;
    ahead?: number;
    behind?: number;
    staged: string[];
    modified: string[];
    untracked: string[];
    deleted: string[];
    timestamp: Date;
  };
}
```

### Configuration & Persistence
| Concern | Storage | Key / Location | Notes |
| --- | --- | --- | --- |
| Active sidebar tab | `localStorage` | `opencode-sidebar-tab` (new) | Restore last viewed status panel per device |
| Sidebar width | `localStorage` | `opencode-sidebar-width` (existing) | Continue to read/write inside sidebar resize handler |
| MCP cache TTL | In-memory | `mcpStatusCache` (hook state) | Refresh every 5s or on SSE reconnect |
| LSP diagnostics store | In-memory | `lspDiagnostics` record within hook | Reset when switching projects/sessions |
| Modified files polling fallback | `setInterval` + state | Clean up on component unmount | Only active when SSE idle for >10s |

### Integration Points
- `src/hooks/useOpenCode.ts`: extend state, SSE handlers, polling lifecycles, and exported helpers.
- `src/contexts/OpenCodeContext.tsx`: expose new state slices (`sidebarStatus`, `refreshSidebarStatus`, etc.).
- `src/lib/opencode-client.ts`: add MCP client helper, enhance git status helper, centralize SSE utilities.
- `src/lib/opencode-server-fns.ts` & `src/lib/opencode-http-api.ts`: add `getMcpStatus` wrappers.
- `src/app/index.tsx`: rework sidebar layout into tabbed panels, wire new context data, preserve project/session list tab, and manage width persistence.
- `src/app/_components/ui/`: add reusable `SidebarTabs`, `SessionContextPanel`, `McpStatusPanel`, `LspStatusPanel`, `ModifiedFilesPanel`, and shared primitives (e.g., `StatusMetric`).
- `src/app/_components/ui/mobile-sidebar.tsx`: update to render the tabbed content on small screens.

---

## Implementation Plan
### Phase 1 – Service & Type Scaffolding
- [x] Review existing client helpers in `src/lib/opencode-client.ts` for reuse and duplication.
- [x] Implement `getMcpStatus` in `src/lib/opencode-http-api.ts` and expose it through `src/lib/opencode-server-fns.ts`.
- [x] Add typed response guards for MCP and git status payloads in `src/lib/opencode-client.ts`.
- [x] Document expected payloads with inline JSDoc to guide downstream code.

### Phase 2 – Hook State & SSE Enhancements
- [x] Introduce `sidebarStatus` state within `src/hooks/useOpenCode.ts` covering session, MCP, LSP, and git subsets.
- [x] Extend SSE handler switch to process `session.updated`, `session.error`, `file.watcher.updated`, and `lsp.client.diagnostics`, updating the new state slice.
- [x] Add MCP + git polling intervals with cleanup tied to hydration and project changes.
- [x] Surface updater utilities (`refreshMcpStatus`, `refreshGitStatus`, etc.) for manual refresh buttons.

### Phase 3 – Context Exposure & Type Safety
- [x] Update `OpenCodeContextType` in `src/contexts/OpenCodeContext.tsx` to include new state and refresh functions.
- [x] Ensure existing consumers remain type-safe; refactor any `any` usages tied to context additions.
- [x] Add targeted unit tests (where feasible) or type assertions for new context shapes.

### Phase 4 – Tabbed Sidebar Framework
- [x] Extract tab navigation into `src/app/_components/ui/sidebar-tabs.tsx` supporting keyboard navigation and ARIA roles.
- [x] Refactor `src/app/index.tsx` sidebar markup to render the new tabbed shell while retaining the current workspace/session list as the default tab.
- [x] Wire tab state to persist via `localStorage` (`opencode-sidebar-tab`) and sync with mobile drawer.

### Phase 5 – Session Context Panel
- [x] Build `SessionContextPanel` component displaying current session metadata, model/agent, message totals, runtime duration, SSE connection, and last error badge.
- [x] Integrate with token usage stats from `sessionUsage` (`src/hooks/useOpenCode.ts`) and `StatusBadge` for quick state cues.
- [x] Add copy/share affordances for session ID and project directory if useful.

### Phase 6 – MCP Server Status Panel
- [x] Create `McpStatusPanel` with list of servers, connection indicators, last heartbeat, and retry controls.
- [x] Hook into MCP polling refresh, showing loading/error states with `Spinner` and `StatusBadge`.
- [x] Queue a fallback toast (development-only) if repeated failures occur.

### Phase 7 – LSP Diagnostics Panel
- [x] Implement `LspStatusPanel` summarizing diagnostics counts per server with severity badges.
- [x] Validate SSE payload structure; add dev-mode logging guard while implementing.
- [x] Provide filtering by project/worktree and "open in file browser" deep links when a diagnostic path is available.

### Phase 8 – Modified Files Panel
- [x] Build `ModifiedFilesPanel` grouped by status (staged, modified, untracked, deleted) with counts and diff affordances.
- [x] Highlight files affected by the latest `file.watcher.updated` event for quick discovery.
- [x] Ensure large file lists stay performant (virtualize or chunk if necessary).

### Phase 9 – Responsiveness, Accessibility, and Polish
- [x] Align desktop + mobile sidebar behavior, ensuring tab navigation works in `MobileSidebar`.
- [x] Confirm resize handle UX, minimum/maximum width, and persistence integration remain intact.
- [x] Add ARIA labels, keyboard shortcuts (e.g., cycle tabs), and tooltips for status icons.
- [x] Update theme tokens or CSS variables if new visual states are introduced.

### Phase 10 – Validation & Documentation
- [x] Update project documentation (README snippet or `/docs/`) if new controls require explanation.
- [x] Add Storybook-like entries or component examples under `component-examples.tsx` if needed.
- [x] Capture screenshots for new panels and place them under `docs/screenshots/`.

---

## Implementation Order & Milestones
1. **Milestone A – Data Backbone (Phases 1-3)**  
   Complete API wrappers, hook state, and context exposure so UI work can start. Blocks subsequent milestones.
2. **Milestone B – Tabbed Shell (Phase 4)**  
   Deliver tab navigation with existing workspace tab functional; ensures regressions caught early.
3. **Milestone C – Status Panels (Phases 5-8)**  
   Implement each panel iteratively: Session Context → MCP → LSP → Modified Files. Each depends on backbone and shell.
4. **Milestone D – Polish & QA (Phases 9-10)**  
   Finalize responsive behavior, accessibility, documentation, and testing before merge.

Dependencies: Milestone B requires A; Milestone C requires A+B; Milestone D requires completion of all previous milestones.

---

## Validation Criteria
### Panel-Specific Acceptance Tests
| Panel | Validation Steps | Tooling |
| --- | --- | --- |
| Session Context | Confirm model/agent/session IDs update on session switch; SSE disconnect indicator toggles during network drop | Manual + DevTools throttling |
| MCP Status | Simulate MCP server start/stop (or mock data); verify polling fallback kicks in when SSE inactive | Local MCP server, mocked responses |
| LSP Diagnostics | Send diagnostics from LSP client; verify counts aggregate and clear when resolved | Connect language server, check logs |
| Modified Files | Modify/stage/delete files; ensure counts update within 1s and highlight latest changes | Local git operations |

### Regression Checklist
- [ ] `bun run lint`
- [ ] `bun x tsc --noEmit`
- [ ] `bun run test`
- [ ] Manual desktop + mobile walkthrough (Chrome responsive mode)
- [ ] Verify sidebar resize persistence and tab persistence across reloads
- [ ] Smoke test session creation/deletion and file browser flows

```bash
bun run lint && bun x tsc --noEmit && bun run test
```

### Monitoring & Logging
- [ ] Add dev-mode console warnings when SSE payloads are missing expected fields.
- [ ] Record timing metrics (optional) to ensure polling cadence does not spam server.

---

## Code References
### Internal
- `src/app/index.tsx`
- `src/app/_components/ui/mobile-sidebar.tsx`
- `src/app/_components/ui/status-badge.tsx`
- `src/hooks/useOpenCode.ts`
- `src/contexts/OpenCodeContext.tsx`
- `src/lib/opencode-client.ts`
- `src/lib/opencode-server-fns.ts`
- `src/lib/opencode-http-api.ts`
- `CONTEXT/SSE-EVENTS-DOCUMENTATION.md`
- `CONTEXT/API-ENDPOINTS-DOCUMENTATION.md`

### External
- `https://github.com/sst/opencode/blob/dev/packages/opencode/src/server/server.ts` – Reference SSE server implementation.
- `https://github.com/sst/opentui` – Example sidebar status UX for inspiration.
- `https://react.dev/reference/react/useMemo` – Performance considerations for derived state.
- `https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent` – Keyboard accessibility patterns.

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| SSE payloads lack severity data for diagnostics | Medium | Inspect upstream repos; fall back to counting events per server while awaiting richer payloads. |
| Polling overlaps with SSE causing race conditions | Medium | Debounce updates and compare timestamps before applying state. |
| Sidebar refactor introduces layout regressions | High | Ship shell under feature flag or guard; regression test existing workspace flows early. |
| Performance degradation with large file lists | Medium | Memoize computed lists and consider virtualization per panel. |
| MCP API offline in some environments | Medium | Present clear error state with retry button and ensure polling stops when offline. |

---

## Open Questions & Follow-Ups
- Confirm detailed payload schema for `/mcp` and `lsp.client.diagnostics`; adjust types accordingly.
- Determine whether session duration should be computed client-side (difference between first and latest message) or fetched from upstream.
- Align with design on iconography for status tabs (reuse existing asset set or add new icons).

---

## Document History
| Version | Date | Author | Notes |
| --- | --- | --- | --- |
| 1.0 | 2025-10-28 | OpenCode Agent | Initial execution plan for GitHub issue #49 |
