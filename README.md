# OpenCode Web Interface

TanStack Start + React web app that surfaces the OpenCode AI coding agent in a responsive, terminal-inspired UI. The project mirrors the patterns used in the OpenCode CLI so feature work stays aligned across codebases.

## Current Capabilities
- Full OpenCode HTTP API coverage through TanStack Start server functions
- Real-time session updates via SSE proxying to the OpenCode server
- Rich message rendering (reasoning blocks, tool runs, patches, files, agents, snapshots)
- File browser with syntax highlighting and image previews
- Session management (create, rename, delete, share) and slash command support
- Responsive layout built with WebTUI components for desktop and mobile

## Requirements
- Bun 1.3.x (see `bunfig.toml` for the pinned toolchain)
- Node.js 18+ for editor tooling
- Running OpenCode server (typically `opencode serve --port 4096`)

## Getting Started

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Configure environment**
   Create `.env.local` with your OpenCode server URL:
   ```bash
   VITE_OPENCODE_SERVER_URL=http://localhost:4096
   ```

3. **Run the dev server**
   ```bash
   bun run dev
   ```
   The app listens on [http://localhost:3000](http://localhost:3000). Devices on the same network can connect by replacing `localhost` with your machine’s IP if your firewall allows access.

## Production Build & Serve

1. Build the client + SSR bundles:
   ```bash
   bun run build
   ```
   Outputs land in `dist/client` and `dist/server`.

2. Serve the production build with Bun:
   ```bash
   bun run start
   ```
   The `start` script runs `server.ts`, which:
   - Loads the TanStack Start SSR handler from `dist/server/server.js`
   - Serves static assets from `dist/client`
   - Proxies `/api/events` to the OpenCode server for SSE streaming

   Set `PORT` or `VITE_OPENCODE_SERVER_URL` in the environment to adjust runtime behaviour. `NODE_ENV` defaults to `production` when not provided.

## Project Structure

```
src/
├── app/                        # TanStack Start routes & UI components
├── lib/                        # OpenCode client + server function helpers
├── router.tsx                  # Router configuration
├── contexts/, hooks/           # React contexts and hooks
server.ts                       # Bun production server wrapper
vite.config.ts                  # Vite + TanStack Start configuration
```

Key files:
- `src/lib/opencode-server-fns.ts` – server functions wrapping the OpenCode HTTP API
- `src/app/_components/message/` – message part renderers (text, tools, patches, etc.)
- `src/app/_components/ui/` – WebTUI-based component library

## Helpful Commands
- `bun run dev` – development server
- `bun run build` – production build
- `bun run start` – Bun server for the production build
- `bun run lint` – ESLint per repo standards
- `bun x tsc --noEmit` – type checking (matches CLI repo workflow)

## Development Notes
- Logging is silenced in production; wrap any additional logs in `if (process.env.NODE_ENV !== "production")`.
- Prefer Bun utilities (e.g. `Bun.file`) in shared helpers when they simplify IO.
- Keep new endpoints and data types aligned with the OpenCode SDK to avoid drift between clients.

## Contributing

Follow the shared contributor handbook in `AGENTS.md`, run lint + typecheck before opening PRs, and document user-facing changes. The web and CLI projects stay in lockstep, so highlight any server-function changes that require Stainless SDK regeneration on the CLI side.
