## Overview
- **Goal:** Align the OpenCode Web client with the OpenCode Server API by removing the obsolete `"disabled"` MCP server status so that only `"connected"` and `"failed"` remain across types, services, UI, and docs.
- **Prepared:** 2025-11-03 in response to gh issue 102 and this conversation requesting a full execution plan.
- **Scope:** Shared TypeScript types, client/server utilities, UI panels (`mcp-status`, `mcp-status-panel`, `src/app/index.tsx` aggregations), and documentation (`docs/MCP_STATUS_USAGE.md`, `docs/MCP_INTEGRATION_EXAMPLE.tsx.example`).

## Context and Decisions
### Drivers
- Backend API (OpenCode Server) no longer emits disabled servers, while the frontend still presents and counts that state, leading to impossible UI states and misleading documentation.
- We must keep API endpoints and polling mechanics intact while shrinking the allowed status union to the two active states.

### Decisions and Rationale
| Decision | Rationale | Source |
| --- | --- | --- |
| Standardize `McpServerStatus` to `"connected" | "failed"` only | Prevents UI/API mismatch now that `/mcp` never returns disabled servers | gh issue 102 (2025-11-03)
| Remove disabled badges, counts, and aggregation branches in UI | Eliminates dead code paths and simplifies visual language | gh issue 102 + MCP status doc review
| Update docs and examples to two-state model | Keeps integrators from implementing unsupported flows | docs/MCP_STATUS_USAGE.md review
| Maintain `GET /mcp` endpoint contract but update its typed response | Avoids breaking consumers while documenting the new type | same as above

### Constraints & Assumptions
- Server endpoint `GET /mcp` (documented in `docs/MCP_STATUS_USAGE.md`) remains the single source of truth; no backend changes are required.
- Status colors stay consistent: green for connected, red for failed; no new color tokens introduced.
- No external package upgrades are expected; changes occur within repo-local files.

## Requirements Trace
| Requirement | Details | Validation |
| --- | --- | --- |
| Remove `"disabled"` from union types and validation logic | `src/types/opencode.ts:170`, `src/lib/opencode-client.ts:18`, any helper mapping statuses | TypeScript compile + targeted unit tests (if any)
| Update UI components to stop rendering or counting disabled servers | `src/app/_components/ui/mcp-status.tsx`, `src/app/_components/ui/mcp-status-panel.tsx`, `src/app/index.tsx` | Manual UI smoke, Storybook/preview (if available)
| Refresh documentation/examples | `docs/MCP_STATUS_USAGE.md`, `docs/MCP_INTEGRATION_EXAMPLE.tsx.example` | Documentation review

## Technical Specifications
### Data Model & Types
| Artifact | Path | Current Behavior | Target Behavior |
| --- | --- | --- | --- |
| `McpServerStatus` union | `src/types/opencode.ts:170` | `"connected" | "failed" | "disabled"` | `"connected" | "failed"`
| `McpStatusResponse` | `src/types/opencode.ts:168` | Record keyed by server with `McpServerStatus` values | Remains the same but new union applies
| Client validation | `src/lib/opencode-client.ts:18` | Accepts three states, may guard/warn on disabled | Accept only two states; treat others as errors

### API Endpoint & Flow
| Tier | Path / Module | Notes |
| --- | --- | --- |
| HTTP fetcher | `src/lib/opencode-http-api.ts` (`getMcpStatus`) | Still hits `GET /mcp`; ensure return type uses updated union
| Server fn | `src/lib/opencode-server-fns.ts` (`getMcpStatus`) | No logic change, but type import should update
| Docs | `docs/MCP_STATUS_USAGE.md` | Update endpoint description, response example, and status badge table
| Example | `docs/MCP_INTEGRATION_EXAMPLE.tsx.example` | Remove disabled sample data and props commentary

### UI Rendering & Aggregation
- `src/app/_components/ui/mcp-status.tsx`: remove yellow badge styling and conditional copy for disabled.
- `src/app/_components/ui/mcp-status-panel.tsx`: adjust summary counts to only track connected/failed; ensure layout remains balanced.
- `src/app/index.tsx` (lines ~743-767 per issue): drop disabled aggregation branches and simplify derived totals.

### Documentation & Communication
- Refresh diagrams/text in `docs/MCP_STATUS_USAGE.md` to show only two status colors; mention API change in Notes.
- Ensure `docs/MCP_INTEGRATION_EXAMPLE.tsx.example` uses mock data that exercises connected/failed only.

### Configuration & Integration Points
| Item | Location | Action |
| --- | --- | --- |
| Status badge tokens | `src/app/_components/ui/mcp-status.tsx` (likely uses shared badge component) | Remove mapping for disabled; confirm default tokens unaffected |
| Polling cadence | `docs/MCP_STATUS_USAGE.md` example (`setInterval` 10s) | No change, but mention only two outcomes |

## Actionable Task Breakdown
### Phase 1 — Inventory & Safeguards
- [x] Run `rg -n "disabled" src docs` to capture any additional references; extend this plan if new critical files appear.
- [x] Note any unit/integration tests touching disabled flows (diff-utils, tool-helpers, etc.); add to later phases if discovered.

### Phase 2 — Types & Validation Foundations
- [x] Update `src/types/opencode.ts` to redefine `McpServerStatus` union and ensure `McpStatusResponse` uses it.
- [x] Adjust any status-related helper types/enums in `src/lib/status-utils.ts` (if applicable) to drop disabled.
- [x] Modify `src/lib/opencode-client.ts` to validate only the two statuses; throw or log for unknown values.

### Phase 3 — UI Components & State Aggregation
- [x] Simplify badge rendering logic in `src/app/_components/ui/mcp-status.tsx`, removing disabled-specific copy/styles.
- [x] Update counts and derived summaries in `src/app/_components/ui/mcp-status-panel.tsx` to only show connected/failed metrics.
- [x] Refactor `src/app/index.tsx` aggregation code (lines ~743-767) to eliminate disabled branches, reorder status precedence, and confirm default states.

### Phase 4 — Documentation & Examples
- [x] Rewrite endpoint description and sample payloads in `docs/MCP_STATUS_USAGE.md` to list only two statuses and remove yellow badge text.
- [x] Update `docs/MCP_INTEGRATION_EXAMPLE.tsx.example` mock data, prop comments, and any status legend references.
- [x] Mention the backend alignment (no disabled servers exposed) in `CONTEXT/IMPLEMENTATION-SUMMARY-2025-11-03.md` if that summary will track the change.

### Phase 5 — Validation & Regression
- [x] Run targeted type and lint checks:
  ```bash
  bun x tsc --noEmit
  bun run lint
  ```
- [x] Execute `bun run test` (or any affected suites) to catch regressions.
- [x] Manually verify MCP status UI in dev (`bun run dev`) to confirm only connected/failed badges render and totals match mock data.
- [x] Review docs for accuracy and internal links before marking complete.

## Implementation Order & Milestones
1. **Milestone A – Contracts Updated** (Phase 2). *Dependency:* Inventory complete.
2. **Milestone B – UI Synced** (Phase 3). *Dependency:* Updated types to prevent TS errors while editing components.
3. **Milestone C – Docs & Examples Updated** (Phase 4). *Dependency:* UI/state naming finalized to describe accurately.
4. **Milestone D – Validation Complete** (Phase 5). *Dependency:* All code/docs changes merged locally.

## Validation Criteria
| Step | Criteria | How to Verify |
| --- | --- | --- |
| Type updates | No references to `"disabled"` remain in TypeScript unions | `rg -n "disabled" src/types src/lib` returns 0 | 
| UI rendering | Only two badge variants render, counts match server payload | Manual check in dev build; inspect DOM for absence of `disabled` | 
| Documentation | `/mcp` endpoint doc + integration example mention two statuses only | Markdown review + `rg -n "disabled" docs` returns only historical notes (if any) |
| Tests/build | Toolchain passes | `bun x tsc --noEmit`, `bun run lint`, `bun run test` |

## Code References
### Internal Paths
| Path | Description |
| --- | --- |
| `src/types/opencode.ts:170` | Source of `McpServerStatus` union and `McpStatusResponse` interface |
| `src/lib/opencode-client.ts:18` | Client-side validation/normalization of MCP status data |
| `src/lib/opencode-http-api.ts` | Fetcher that hits `GET /mcp` |
| `src/lib/opencode-server-fns.ts` | Server function proxy for MCP status |
| `src/app/_components/ui/mcp-status.tsx` | Badge rendering component |
| `src/app/_components/ui/mcp-status-panel.tsx` | Summary panel listing counts |
| `src/app/index.tsx:743-767` | Aggregation logic feeding panels |
| `docs/MCP_STATUS_USAGE.md` | API + UI guidance needing updates |
| `docs/MCP_INTEGRATION_EXAMPLE.tsx.example` | Example integration referencing disabled state |

### External References
| Resource | URL | Usage |
| --- | --- | --- |
| (None required) | - | Backend/API are internal; no third-party code changes needed |

## Risks and Mitigations
- **Hidden disabled references** (e.g., tests, context files) → Mitigate with exhaustive `rg` searches and code review.
- **UI spacing regressions** after removing a column/count → Validate visually on desktop + mobile layouts.
- **Docs drift** if other guides mention disabled status → Include doc search in Phase 4 and update any newly found files.

## Next Steps
- Follow the phased tasks above in order, checking off each `- [ ]` item.
- Document findings or additional affected files back into this plan or `CONTEXT/IMPLEMENTATION-SUMMARY-2025-11-03.md` so future contributors maintain traceability.
