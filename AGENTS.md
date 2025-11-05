# OC Web Agent Guidelines

These guidelines ensure consistency across the OC Web project. Follow web development best practices and maintain clean, maintainable code.

## Build/Test Commands

- **Install**: `bun install`
- **Dev**: `bun run dev`
- **Build**: `bun run build`
- **Lint**: `bun run lint`
- **Typecheck**: `bun x tsc --noEmit`
- **Test** (if present): `bun run test`

## Code Style Expectations

- Prefer Bun APIs (`Bun.file`, `Bun.readableStreamFromAsyncIterator`, etc.) whenever they make sense in shared utilities.
- Avoid `any`, unnecessary `let`, extra destructuring, and `else` blocks—maintain a minimalist style.
- Keep components/functions focused; extract helpers only when they're reused.
- Use TypeScript interfaces/types for data structures and Zod schemas when validating server function inputs.
- Guard logging behind development checks (`process.env.NODE_ENV !== "production"`) and never print secrets.

## Project Patterns

- Follow TanStack Start conventions already in `src` (file-based routes, server functions for OpenCode HTTP calls).
- Reuse the OpenCode SDK types instead of duplicating shapes; create local wrappers only when the upstream SDK is unavailable.
- When updating server endpoints that proxy OpenCode, note it in PR descriptions for API compatibility tracking.

## Pull Request Checklist

- Format with `bun x prettier --check .` before pushing.
- Run `bun run lint` and `bun x tsc --noEmit`.
- Confirm UI changes in both desktop and mobile layouts when applicable.

## Local Dev Ergonomics

- **Check for existing servers first**: Before starting any dev server or preview server, verify whether one is already running. Generally, an active server will be present. Do not start extra servers on different ports.
- Run preview servers inside their own tmux session (for example `tmux new -s codex_dev 'bun run dev'`) so you can monitor logs without interfering with the user's panes. Only kill the tmux sessions you create.
- **DevTools MCP**: When using DevTools MCP, always check what tabs are currently open before opening new ones. Reuse existing tabs when possible.
