# OpenCode Web Agent Guidelines

These rules mirror the upstream `opencode` repository so changes between the CLI and web projects stay consistent. When in doubt, copy the approach you see in `opencode/packages/opencode`.

## Build/Test Commands

- **Install**: `bun install`
- **Dev**: `bun run dev`
- **Build**: `bun run build`
- **Lint**: `bun run lint`
- **Typecheck**: `bun x tsc --noEmit`
- **Test** (if present): `bun run test`

## Code Style Expectations

- Prefer Bun APIs (`Bun.file`, `Bun.readableStreamFromAsyncIterator`, etc.) whenever they make sense in shared utilities.
- Avoid `any`, unnecessary `let`, extra destructuring, and `else` blocks—match the CLI repo’s minimalist style.
- Keep components/functions focused; extract helpers only when they’re reused.
- Use TypeScript interfaces/types for data structures and Zod schemas when validating server function inputs.
- Guard logging behind development checks (`process.env.NODE_ENV !== "production"`) and never print secrets.

## Project Patterns

- Follow TanStack Start conventions already in `src` (file-based routes, server functions for OpenCode HTTP calls).
- Reuse the OpenCode SDK types instead of duplicating shapes; create local wrappers only when the upstream SDK is unavailable.
- When updating server endpoints that proxy OpenCode, note it in PR descriptions so the CLI team can regenerate Stainless SDKs if needed.

## Pull Request Checklist

- Format with `bun x prettier --check .` before pushing.
- Run `bun run lint` and `bun x tsc --noEmit`.
- Confirm UI changes in both desktop and mobile layouts when applicable.
