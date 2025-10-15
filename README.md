# OpenCode Web Interface

A modern TanStack Start web application that provides a powerful, feature-rich interface to connect to and interact with the OpenCode server. This web app allows users to access OpenCode's AI-powered code agent from any device, including mobile phones and tablets, through a clean, terminal-inspired UI built with WebTUI components.

## ✨ Current Status

**Phase 1 & 2 Complete** ✅
- ✅ Full TanStack Start migration with server functions
- ✅ All 41+ OpenCode HTTP API endpoints implemented
- ✅ Rich message parts display (text, reasoning, tools, files, patches, agents)
- ✅ Syntax highlighting for 20+ languages
- ✅ Image preview support
- ✅ Real-time event streaming (SSE)
- ✅ Advanced session management
- ✅ Complete command implementations

## 🚀 Features

### Core Functionality
- **Cross-Device Access**: Connect to your OpenCode server from any device on your network
- **Terminal-Inspired UI**: Beautiful WebTUI components that bring terminal aesthetics to the web
- **Full API Coverage**: All 41+ OpenCode HTTP endpoints implemented via TanStack Start server functions

### Rich Message Display
- **Message Parts Rendering**: Full support for all 9 message part types
  - Text content with markdown support
  - Collapsible reasoning blocks (thinking tokens)
  - Tool execution with state tracking (pending/running/completed/error)
  - File attachments with preview
  - Step boundaries with metrics (tokens, cost, timing)
  - Git diffs/patches
  - Agent switching indicators
  - Snapshot markers
- **Metadata Display**: View tokens, cost, model, and agent info per message

### File Viewer
- **Syntax Highlighting**: Support for 20+ languages (JS, TS, Python, Go, Rust, etc.)
- **Image Preview**: Display PNG, JPG, GIF, SVG, and other image formats
- **Code Navigation**: File browser with search
- **Copy to Clipboard**: Quick code copying

### Session Management
- **Create/Switch Sessions**: Manage multiple coding sessions
- **Session Commands**: Full support for /new, /delete, /rename, /share, /init, /compact
- **Session Export**: Export sessions as markdown
- **Undo/Redo**: Revert and restore changes with file system integration

### Real-time Features
- **Server-Sent Events**: Live updates without page refresh
- **Tool Progress**: Real-time tool execution progress
- **Permission Handling**: Interactive permission request dialogs
- **File Change Notifications**: Auto-refresh on file edits

### Commands & Interactions
- **Slash Commands**: /new, /undo, /redo, /models, /agents, /help, /share, /export, /init, /compact
- **File References**: Use @filename to include files in prompts
- **Shell Commands**: Execute shell commands with !command
- **Search**: Find files and search text across codebase

### UI/UX Polish
- **Keyboard Shortcuts**: Quick access to common actions
- **Loading States**: Skeleton loaders for better UX
- **Error Handling**: User-friendly error messages
- **Mobile Optimized**: Responsive design for phones and tablets
- **TypeScript Support**: Full type safety throughout

## 🏗️ Architecture

```
[Your Computer] ──── OpenCode Server (localhost:4096)
                            │
                            │ OpenCode HTTP API (41+ endpoints)
                            │
                    TanStack Start Server Functions
                            │
                            │ Three-Layer Architecture:
                            │ 1. HTTP API Integration
                            │ 2. Server Functions (RPC)
                            │ 3. Client Service Layer
                            │
[Phone/Browser] ──── TanStack Start Web App
                            │
                            ├── WebTUI Components
                            ├── Message Parts System
                            ├── File Viewer
                            └── Real-time SSE

```

**Three-Layer Architecture**:
1. **OpenCode HTTP API**: Direct integration with OpenCode server endpoints
2. **TanStack Start Server Functions**: Type-safe RPC layer with input validation
3. **Client Service**: Browser-side service for state management and UI updates

**Benefits**:
- ✅ OpenCode server stays internal (never exposed to internet)
- ✅ Type-safe server functions with automatic serialization
- ✅ No CORS issues - server functions handle all API calls
- ✅ Enhanced security through server-side request handling
- ✅ Real-time updates via SSE integration

## 📋 Prerequisites

- **OpenCode Server**: Running on your development machine (or accessible server)
- **Bun**: Version 1.3.x (matches the main `opencode` repository)
- **Node.js**: Version 18 or higher (tooling & editor support)
- **Network Access**: For remote access, devices must be on the same network

## 🛠️ Quick Start

### 1. Start OpenCode Server

On your development machine, start the OpenCode server:

```bash
# For local development only
opencode serve --port=4096

# For network access (use with caution)
opencode serve --hostname=0.0.0.0 --port=4096
```

The OpenCode server exposes a comprehensive HTTP API with 41+ endpoints. See [CONTEXT.md](CONTEXT.md) for full API documentation.

### 2. Install Dependencies

```bash
bun install
```

> [!NOTE]
> We pin installs via `bunfig.toml`; confirm `bun --version` reports `1.3.x` before running commands.

**Dependencies include**:
- TanStack Start (React framework with server functions)
- highlight.js (syntax highlighting)
- WebTUI components
- TypeScript for full type safety

### 3. Configure Environment

Create a `.env.local` file in the project root:

```bash
# OpenCode server URL (server-side only, not exposed to browser)
VITE_OPENCODE_SERVER_URL=http://localhost:4096
```

**For local development**: Use `http://localhost:4096`

**For production/Docker**: Use internal network URL like `http://opencode-server:4096`

### 4. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 5. First Time Setup

1. **Select Project**: Use the project picker to choose your codebase directory
2. **Create Session**: Click "New Session" or use `/new` command
3. **Select Model**: Choose AI model/provider via the model picker
4. **Start Coding**: Send messages, execute commands, and let OpenCode assist!

## 🧭 Contributor Guide

- Follow the shared standards documented in [`AGENTS.md`](AGENTS.md); they mirror the CLI repo’s expectations (Bun-first workflow, minimal `any`, careful logging).
- Before opening a PR run `bun run lint`, `bun x tsc --noEmit`, and `bun run build` to stay aligned with the upstream OpenCode check suite.

## 📱 Mobile Access

To access from mobile devices:

1. Ensure your phone is on the same WiFi network as your development machine
2. Find your computer's local IP address:
   - **macOS/Linux**: Run `ifconfig` or `ip addr`
   - **Windows**: Run `ipconfig`
3. Access via `http://YOUR_COMPUTER_IP:3000`

**Note**: The OpenCode server (port 4096) stays on localhost for security. Only the TanStack Start web app (port 3000) needs network access. All OpenCode API calls are proxied through server functions.

## 🎨 UI Components

This project includes a comprehensive set of React components built on top of the WebTUI CSS library. The components provide a terminal-inspired aesthetic while maintaining modern web functionality.

### Available Components

- **Badge**: Status indicators and labels
- **Button**: Interactive buttons with various styles
- **Input/Textarea**: Form inputs with terminal styling
- **Checkbox/Radio/Switch**: Form controls
- **Table**: Data tables with header, body, and cell components
- **Dialog**: Modal dialogs
- **Popover/Tooltip**: Contextual information displays
- **Separator**: Visual dividers
- **Progress/Spinner**: Loading and progress indicators
- **View**: General container with box utilities

### Component Documentation

For detailed component usage, props, and examples, see:
- [`src/app/_components/ui/ui.md`](src/app/_components/ui/ui.md) - Complete component reference

### Example Usage

```tsx
import { Button, Badge, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/_components/ui';

function MyComponent() {
  return (
    <div>
      <Badge variant="background2" cap="round">New</Badge>
      <Button variant="foreground0" box="round">Click me</Button>
      <Input size="large" placeholder="Enter text" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Project Alpha</TableCell>
            <TableCell><Badge variant="background2">Active</Badge></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
```

## 🔧 OpenCode Integration

The app integrates with OpenCode through **TanStack Start server functions**, providing a type-safe RPC layer over the OpenCode HTTP API.

### TanStack Start Server Functions

All OpenCode API calls are wrapped in server functions with:
- **Type Safety**: Full TypeScript support with input validation
- **Automatic Serialization**: JSON serialization handled automatically
- **Error Handling**: Structured error responses
- **Security**: Server-side execution prevents API exposure

See [CONTEXT.md](CONTEXT.md) for detailed TanStack Start patterns and examples.

### Server-Sent Events (SSE)

Real-time updates via SSE for:
- Message streaming and updates
- Session state changes
- File system notifications
- Permission requests
- Error notifications

See [SSE.md](SSE.md) for complete SSE event documentation and implementation examples.

### API Coverage

All 41+ OpenCode HTTP endpoints are implemented:

**App & Config**
- Get app info, initialize app
- Get config, list providers and models

**Sessions** (15+ endpoints)
- Create, read, update, delete sessions
- Get messages, send chat messages
- Run shell commands
- Revert/unrevert changes
- Share/unshare sessions
- Initialize and summarize sessions
- Handle permission requests

**Files** (5 endpoints)
- Search text in files
- Find files by name
- Find workspace symbols
- Read file contents
- Get file status

**Real-time** (SSE)
- Message updates
- Tool execution progress
- Session changes
- Permission requests
- File edit notifications

**Other**
- List agents
- Authentication
- Logging

See [src/lib/opencode-server-fns.ts](src/lib/opencode-server-fns.ts) for all server function implementations.

## 📁 Project Structure

```
src/
├── app/
│   ├── _components/
│   │   ├── message/                      # Message part components
│   │   │   ├── MessagePart.tsx          # Part router component
│   │   │   ├── TextPart.tsx             # Text content
│   │   │   ├── ReasoningPart.tsx        # Thinking blocks (collapsible)
│   │   │   ├── ToolPart.tsx             # Tool execution display
│   │   │   ├── FilePart.tsx             # File attachments
│   │   │   ├── StepPart.tsx             # Step boundaries with metrics
│   │   │   ├── PatchPart.tsx            # Git diff viewer
│   │   │   ├── AgentPart.tsx            # Agent indicators
│   │   │   ├── SnapshotPart.tsx         # Snapshot markers
│   │   │   └── index.ts                 # Exports
│   │   └── ui/                          # WebTUI React components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── table.tsx
│   │       ├── dialog.tsx
│   │       ├── ui.md                    # Component documentation
│   │       └── ...
│   ├── __root.tsx                       # Root route
│   ├── index.tsx                        # Main page component
│   ├── globals.css                      # Global styles with WebTUI
│   └── favicon.ico
├── contexts/
│   └── OpenCodeContext.tsx              # OpenCode state context
├── hooks/
│   ├── useOpenCode.ts                   # Main OpenCode hook
│   └── useTheme.ts                      # Theme management
├── lib/
│   ├── opencode-server-fns.ts           # TanStack Start server functions (41+ endpoints)
│   ├── opencode-http-api.ts             # Direct HTTP API client
│   ├── opencode-client.ts               # Client-side service
│   ├── highlight.ts                     # Syntax highlighting utilities
│   ├── commands.ts                      # Command parser
│   └── themes.ts                        # Theme definitions
├── router.tsx                           # TanStack Router config
├── server.ts                            # Vite server entry
└── vite.config.ts                       # Vite configuration
```

### Key Files

- **src/lib/opencode-server-fns.ts**: All server functions wrapping OpenCode API
- **src/app/_components/message/**: Rich message part rendering system
- **src/lib/highlight.ts**: Syntax highlighting for 20+ languages
- **src/hooks/useOpenCode.ts**: Main hook for OpenCode operations
- **src/contexts/OpenCodeContext.tsx**: Global state management

## 🎯 Available Commands

The web interface supports all OpenCode commands:

### Session Commands
- `/new` - Create new session
- `/delete` - Delete current session
- `/rename <title>` - Rename current session
- `/sessions` - Show session picker
- `/share` - Share session (generates URL)
- `/unshare` - Unshare session

### Tool Commands
- `/init` - Initialize project (creates AGENTS.md)
- `/compact` - Summarize long sessions
- `/undo` - Revert last message and file changes
- `/redo` - Restore reverted changes
- `/export` - Export session as markdown

### Configuration
- `/models` - Select AI model/provider
- `/agents` - Select agent mode
- `/themes` - Change color theme
- `/help` - Show help dialog

### Special Syntax
- `@filename` - Reference file in prompt
- `!command` - Execute shell command

## 🌐 Network & Troubleshooting

### Firewall Settings (for network access)

If accessing from other devices, ensure firewall allows port 3000:

**macOS:**
```bash
sudo pfctl -f /etc/pf.conf
```

**Windows:**
Allow Node.js through Windows Firewall when prompted.

**Linux:**
```bash
sudo ufw allow 3000
```

### Common Issues

1. **Connection refused**: 
   - Verify OpenCode server is running: `opencode serve --port=4096`
   - Check `VITE_OPENCODE_SERVER_URL` in `.env.local`

2. **Server functions fail**:
   - Ensure TanStack Start dev server is running: `bun run dev`
   - Check browser console for errors

3. **Messages not displaying parts**:
   - Verify OpenCode server is returning `parts` array in messages
   - Check message part components are imported correctly

4. **Syntax highlighting not working**:
   - Ensure `highlight.js` is installed: `bun install`
   - Check file extension is in `EXTENSION_MAP` (src/lib/highlight.ts)

5. **Real-time updates not working**:
   - Verify SSE connection in Network tab (should see `/event` endpoint)
   - Check OpenCode server supports event streaming

## 🚀 Deployment

### Development
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
# Build for production
bun run build

# Start production server
bun run start
```

### Environment Variables for Production

```bash
# OpenCode server URL (server-side only)
VITE_OPENCODE_SERVER_URL=http://localhost:4096

# For Docker deployments, use internal network URL
VITE_OPENCODE_SERVER_URL=http://opencode-server:4096
```

**Important**: The `VITE_OPENCODE_SERVER_URL` is only used by TanStack Start server functions. It's never exposed to the browser, ensuring the OpenCode server stays internal.

### Cloudflare Tunnel / Reverse Proxy

TanStack Start's server functions work seamlessly with reverse proxies:

```yaml
tunnel: <tunnel-id>
ingress:
  - hostname: your-app.com
    service: http://localhost:3000  # TanStack Start app only
  - service: http_status:404
```

**Security Note**: Only expose port 3000 (TanStack Start). Never expose port 4096 (OpenCode server) directly. All API calls are securely proxied through server functions.

## 🔒 Security Considerations

### Built-in Security

- ✅ **OpenCode server stays internal** - Never exposed to internet
- ✅ **Server functions proxy all requests** - Browser never directly accesses OpenCode API
- ✅ **Type-safe validation** - Input validation on all server functions
- ✅ **No CORS issues** - Server functions handle all cross-origin concerns
- ✅ **Secure by default** - `VITE_OPENCODE_SERVER_URL` only accessible server-side

### Production Security Checklist

- [ ] Add authentication to TanStack Start app (middleware)
- [ ] Implement rate limiting on server functions
- [ ] Use HTTPS for all connections (reverse proxy/CDN)
- [ ] Keep OpenCode server on internal network only (localhost or Docker network)
- [ ] Monitor and log server function requests
- [ ] Consider VPN for additional network security
- [ ] Set up proper environment variables (never commit `.env.local`)

### Recommended Security Enhancements

```typescript
// Example: Add auth middleware to server functions
import { createServerFn } from '@tanstack/react-start'

const authenticatedFn = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    // Only runs if authenticated
  })
```

## 🐳 Docker Deployment

### Docker Compose Example

```yaml
services:
  opencode-server:
    image: opencode/server
    ports:
      - "127.0.0.1:4096:4096"  # Localhost only!
    volumes:
      - ./projects:/projects

  opencode-web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - VITE_OPENCODE_SERVER_URL=http://opencode-server:4096
    depends_on:
      - opencode-server
```

### Dockerfile

```dockerfile
FROM ghcr.io/oven-sh/bun:1.3.0

WORKDIR /app

COPY bun.lock package.json ./
RUN bun install

COPY . .
RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
```

## 🗺️ Development Roadmap

See [ENHANCEMENTS.md](ENHANCEMENTS.md) for the complete enhancement plan.

### Completed ✅
- **Phase 1**: Message Parts Display System (all 9 part types)
- **Phase 2**: File Viewer Enhancements (syntax highlighting, images)
- **Phase 3**: Command Implementations (all 13 TODOs resolved)
- **Phase 4**: Event Streaming (real-time SSE updates)
- **Phase 5**: UI/UX Polish (keyboard shortcuts, loading states, error handling)

### Future Enhancements
- Message search/filter
- Message threading
- In-browser file editing
- Custom themes editor
- Plugin system
- Multi-workspace support
- Collaborative sessions

## 📚 Documentation

- **[CONTEXT.md](CONTEXT.md)** - OpenCode HTTP API reference and TanStack Start patterns
- **[ENHANCEMENTS.md](ENHANCEMENTS.md)** - Detailed enhancement plan and implementation guide
- **[src/app/_components/ui/ui.md](src/app/_components/ui/ui.md)** - WebTUI component documentation

### External Resources

- [OpenCode](https://opencode.ai) - Official OpenCode documentation
- [TanStack Start](https://tanstack.com/router/latest/docs/framework/react/start/getting-started) - TanStack Start framework
- [WebTUI](https://github.com/webtui/webtui) - WebTUI CSS library
- [highlight.js](https://highlightjs.org/) - Syntax highlighting

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
   - Follow existing code style
   - Use TypeScript for type safety
   - Add comments for complex logic
4. **Test your changes**
   - Test with OpenCode server running
   - Check all message part types render correctly
   - Verify commands work as expected
5. **Submit a pull request**

### Development Guidelines

- **Server Functions**: Add new OpenCode endpoints in `src/lib/opencode-server-fns.ts`
- **Message Parts**: Add new part types in `src/app/_components/message/`
- **UI Components**: Follow WebTUI patterns in `src/app/_components/ui/`
- **Type Safety**: Use OpenCode SDK types where available
- **Documentation**: Update README and CONTEXT.md for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🎯 Quick Reference

**Tech Stack**: TanStack Start + React + TypeScript + WebTUI + highlight.js

**Key Files**:
- `src/lib/opencode-server-fns.ts` - All 41+ server functions
- `src/app/index.tsx` - Main UI component
- `src/app/_components/message/` - Message part rendering
- `CONTEXT.md` - API & patterns reference

**Commands**: `/new`, `/undo`, `/redo`, `/models`, `/agents`, `/share`, `/export`, `/init`, `/compact`, `/help`

**Architecture**: OpenCode HTTP API → TanStack Server Functions → React UI

---

**Note**: This web interface requires an OpenCode server running on your machine or network. The server handles all AI operations while this web app provides a rich, feature-complete user interface with real-time updates, syntax highlighting, and comprehensive message part rendering.
