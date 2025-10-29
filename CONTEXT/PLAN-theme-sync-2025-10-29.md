## Overview
### Goal
Reconcile the web client's theme definitions with the official OpenCode TUI source so that color palettes, semantic mappings, and runtime behaviour stay in lock-step across products.

### Context Capture
- Issue [#75](https://github.com/kcrommett/opencode-web/issues/75) identifies drift between `src/lib/themes.ts` and the authoritative JSON themes in `sst/opencode/packages/tui/internal/theme/themes/`.
- The issue documents that web themes hardcode hex values, some themes are missing, and semantic references from the JSON source (e.g. `darkStep9`) are not represented.
- Conversation decisions:
  - Produce a comprehensive execution plan before touching code.
  - Treat the TUI JSON files as the single source of truth and ensure the web implementation mirrors them exactly.
  - Consider creating a repeatable conversion utility so future upstream changes can be ingested quickly.
  - Preserve compatibility with existing runtime semantics (`applyTheme`, CSS variables, config-driven theme selection).

## Current Architecture
### Theme Definitions
- `src/lib/themes.ts` defines the `Theme` interface plus all theme color maps. These are the authoritative values used by the web UI at runtime.

### Theme Application
- `src/hooks/useTheme.ts` resolves the theme (config override → stored preference → default), applies it via `applyTheme`, and persists selection with the `opencode-theme` localStorage key.
- `src/app/index.tsx:706` consumes `useTheme` to expose `currentTheme`/`changeTheme` for UI components and modals.
- `src/lib/themes.ts:1176` exports `applyTheme`, which writes CSS variables (`--theme-*`, `--background*`, `--foreground*`) to `document.documentElement` and updates `<meta name="theme-color">`.
- `src/app/globals.css:43` seeds default `--theme-*` variables and maps them into WebTUI variables for styling before JavaScript hydrates.

### Persistence & Configuration
- Theme overrides can arrive through runtime config (`config?.theme`) supplied by `useOpenCodeContext`, or fall back to persisted localStorage. No server API is currently invoked for theme synchronization.

## External Source of Truth
- Canonical theme definitions: `https://github.com/sst/opencode/tree/dev/packages/tui/internal/theme/themes`
  - Example files:
    - OpenCode: `https://github.com/sst/opencode/blob/dev/packages/tui/internal/theme/themes/opencode.json`
    - Tokyo Night: `https://github.com/sst/opencode/blob/dev/packages/tui/internal/theme/themes/tokyonight.json`
    - Catppuccin: `https://github.com/sst/opencode/blob/dev/packages/tui/internal/theme/themes/catppuccin.json`

## Technical Specifications
### Data Model Reference
```ts
// src/lib/themes.ts
interface Theme {
  name: string;
  id: string;
  colors: {
    background: string;
    backgroundAlt: string;
    backgroundAccent: string;
    foreground: string;
    foregroundAlt: string;
    border: string;
    primary: string;
    primaryHover: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
    backgroundPanel: string;
    backgroundElement: string;
    borderActive: string;
    borderSubtle: string;
    textMuted: string;
    secondary: string;
    accent: string;
    info: string;
    diffAdded: string;
    diffRemoved: string;
    diffContext: string;
    diffAddedBg: string;
    diffRemovedBg: string;
    diffContextBg: string;
    markdownHeading: string;
    markdownLink: string;
    markdownCode: string;
    markdownBlockQuote: string;
    syntaxComment: string;
    syntaxKeyword: string;
    syntaxString: string;
    syntaxFunction: string;
    diffHunkHeader: string;
    diffHighlightAdded: string;
    diffHighlightRemoved: string;
    diffLineNumber: string;
    diffAddedLineNumberBg: string;
    diffRemovedLineNumberBg: string;
  };
}
```

### Mapping Table (JSON → Web Theme)
| Web Key | Source JSON reference | Notes |
| --- | --- | --- |
| `background` | `theme.background.dark` → `defs.*` | Use resolved hex for dark mode (web is dark-mode only). |
| `backgroundAlt` | `theme.backgroundAlt.dark` (or closest semantic) | If absent, choose next darkest step from `defs`. |
| `foreground` | `theme.text.dark` | Primary foreground text color. |
| `foregroundAlt` | `theme.textMuted.dark` or `theme.subtleText.dark` | Used for secondary text/UI captions. |
| `border` | `theme.border.dark` | Default stroke color. |
| `primary` | `theme.primary.dark` | Buttons / highlights primary channel. |
| `primaryHover` | `theme.primary.darkHover` or nearest accent | Maintain accessible hover contrast. |
| `secondary` | `theme.secondary.dark` | Secondary CTA color if provided. |
| `accent` | Additional accent from theme (often `theme.accent.dark`). |
| `info`/`success`/`warning`/`error` | Corresponding semantic entries (resolve via defs). |
| `diff*` | If explicit diff colors exist, map directly; otherwise use semantic approximations (primary for added, error for removed). |
| `markdown*`/`syntax*` | Map to syntax highlight palette (e.g. `theme.syntax.keyword.dark`). |
| `diffLineNumber`/`Bg` | Derive from neutral palette to maintain readability on diffs. |

Document any deviations in comments within `themes.ts` if an exact semantic key is missing.

### Potential Conversion Utility
- Candidate location: `script/src/` or `packages/script/src/` to align with existing tooling.
- Responsibilities:
  - Load JSON from `sst/opencode` (local checkout or remote fetch).
  - Resolve `defs` references into hex values.
  - Emit deterministic TypeScript (object literal or JSON) matching `Theme` interface order.
- Keep output stable to avoid noisy diffs; consider sorting keys and themes alphabetically.

### Configuration Requirements
- Maintain compatibility with existing `opencode-theme` localStorage persistence in browsers.
- Ensure new themes (if added) have unique `id` strings and are surfaced through `themeList` for UI pickers.
- If bundling additional assets (screenshots, previews), store under `docs/screenshots/` following existing naming convention.

### API Endpoints & Integrations
- No new HTTP endpoints required. Theme data remains static and bundled in `src/lib/themes.ts`.
- Verify that server-provided config can still pass `config.theme` identifiers that exist in the updated `themes` map.
- Confirm no MCP or WebTUI integration changes are needed beyond updated CSS variables.

## Implementation Plan (Ordered)
### Milestone 1 — Source Theme Inventory
- [x] Clone or update a local checkout of `sst/opencode` at branch `dev` to access canonical theme JSON.
- [x] Catalogue all JSON files under `packages/tui/internal/theme/themes/`, noting any not present in the web client.
- [x] Capture metadata (theme ids, display names, semantic keys) in a working spreadsheet or markdown table for reference.
- Validation: Verify JSON files parse and list matches GitHub directory contents; document any missing or deprecated themes.

### Milestone 2 — Mapping Definition & Tooling
- [x] Define exact mapping between JSON schema (`defs`, `theme`, optional variants) and the `Theme` interface keys above.
- [x] Decide whether to implement a conversion script or perform a one-time manual migration; record rationale.
- [x] If scripting, scaffold a Bun-powered utility under `script/src/` that resolves JSON references and outputs TypeScript.
- [x] Document fallback rules for absent fields (e.g. reuse `primary` for `primaryHover` when hover not provided).
- Validation: Dry-run the mapping on one theme (e.g. `opencode.json`) and confirm generated values match expected hex codes.

### Milestone 3 — Update Web Theme Definitions
- [x] Apply the finalized mapping to every theme in `src/lib/themes.ts`, ensuring object key order remains stable.
- [x] Add any missing themes, including `name`, `id`, and fully populated `colors` blocks.
- [x] Remove or flag any deprecated themes not found upstream (document rationale in commit message/PR notes).
- [x] Update inline comments (sparingly) if fallback logic is used for specific keys.
- Validation: Compare each updated theme against source JSON (automated diff or manual checklist) to guarantee parity.

### Milestone 4 — Runtime & UI Integration
- [x] Confirm `useTheme` and `applyTheme` continue to function without additional keys (extend typing if needed).
- [x] Review `src/app/globals.css` and other CSS modules for assumptions about specific color ranges; adjust defaults to match new baseline theme.
- [x] Smoke-test theme switching UI in `src/app/index.tsx` to ensure new themes show up and apply correctly.
- [x] Capture optional before/after screenshots for key themes under `docs/screenshots/` if visual QA requires evidence.
- Validation: Manually toggle through themes in development build and confirm CSS variables update via browser devtools.

### Milestone 5 — Quality Gates & Documentation
- [x] Run `bun run lint`, `bun x tsc --noEmit`, and targeted tests (`bun run test` if applicable) to ensure no regressions.
- [x] Update any user-facing documentation or release notes referencing available themes.
- [x] Prepare commit message referencing Issue #75 and summarizing the synchronization approach.
- [x] Draft PR checklist (visual diffs verified, script documented, tests run) before submission.
- Validation: CI pipelines pass locally; reviewers can trace each color back to upstream JSON via documented mapping.

## Validation Criteria
- [x] Every theme in `src/lib/themes.ts` matches the hex values defined in the corresponding JSON file (no drift).
- [x] Newly added themes (if any) appear in the theme picker and obey existing semantics (primary/secondary, diff colors, markdown styling).
- [x] `applyTheme` successfully sets expected CSS custom properties without runtime errors when iterating new keys.
- [x] Default theme fallback (`catppuccin`) still renders correctly before hydration (`globals.css`).
- [x] Regression suite (`bun run lint`, `bun x tsc --noEmit`, `bun run test`) passes without additional configuration.
- [x] Manual visual QA confirms parity with OpenCode TUI for at least the updated themes listed in the issue.

## Risks & Mitigations
- **Upstream Sync Drift**: Future updates to TUI themes could reintroduce mismatch. *Mitigation*: retain conversion tooling and document rerun process.
- **Semantic Gaps**: Some JSON definitions may not provide all fields needed for the web interface. *Mitigation*: codify fallback rules and log discrepancies in PR notes.
- **Bundle Size Growth**: Adding more themes increases bundle size. *Mitigation*: measure after update; consider lazy-loading or generating CSS variables on demand if necessary.
- **Manual QA Overhead**: Visual verification across many themes is time-consuming. *Mitigation*: script automated snapshots or prioritize high-usage themes first.

## Suggested Commands & Utilities
```bash
# Fetch latest source themes (run outside repo root if needed)
gh repo clone sst/opencode ../tmp/opencode-source --depth=1 --branch dev

# Execute conversion utility once created
bun run script sync-themes -- --source ../tmp/opencode-source/packages/tui/internal/theme/themes

# Standard quality gates
bun run lint
bun x tsc --noEmit
bun run test
```

## Open Questions
- Should we bundle light-mode variants if present in the TUI JSON, or restrict to dark mode?
- Do we need automated visual diffing (e.g. Playwright screenshots) to prevent future color drift?
- Should theme metadata (description, author) surface in UI for user clarity?
