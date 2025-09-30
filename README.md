# OpenCode Web Interface

A modern Next.js web application that provides a user-friendly interface to connect to and interact with the OpenCode server. This web app allows users to access OpenCode's AI-powered code agent from any device, including mobile phones and tablets, through a clean, terminal-inspired UI built with WebTUI components.

## 🚀 Features

- **Cross-Device Access**: Connect to your OpenCode server from any device on your network
- **Terminal-Inspired UI**: Beautiful WebTUI components that bring terminal aesthetics to the web
 - **Real-time Chat**: Interactive conversations with the OpenCode AI agent
 - **Slash Commands**: Full support for TUI commands like /new, /undo, /models, /help
 - **File References**: Use @filename to include files in prompts
 - **Shell Commands**: Execute shell commands with !command
 - **Session Management**: Create and manage multiple coding sessions
 - **File Operations**: Browse, read, and search through your codebase
 - **Mobile Optimized**: Responsive design that works great on phones and tablets
 - **TypeScript Support**: Full type safety and excellent developer experience

## 🏗️ Architecture

```
[Your Computer] ──── OpenCode Server (localhost:4096)
                            │
                            │ Internal HTTP API
                            │
                    Next.js Backend Proxy
                            │
                            │ Secure Proxy Layer
                            │
[Phone/Browser] ──── Next.js Web App ──── OpenCode SDK
                            │
                            └── WebTUI Components
```

**Proxy Architecture**: The app uses a secure proxy pattern where all OpenCode requests from the browser are routed through Next.js API routes. This ensures:
- ✅ OpenCode server stays internal (never exposed to internet)
- ✅ Works with Cloudflare Tunnels and reverse proxies
- ✅ No CORS issues
- ✅ Enhanced security through centralized request handling

## 📋 Prerequisites

- **OpenCode Server**: Running on your development machine
- **Node.js**: Version 18 or higher
- **Network Access**: Devices must be on the same network

## 🛠️ Quick Start

### 1. Start OpenCode Server

On your development machine, start the OpenCode server with network access:

```bash
# Allow external connections (not just localhost)
opencode serve --hostname=0.0.0.0 --port=4096
```

### 2. Install Dependencies

```bash
bun install
# or
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment

Create a `.env.local` file in the project root:

```bash
# Server-side only - not exposed to browser
OPENCODE_SERVER_URL=http://localhost:4096

# Client-side proxy endpoint
NEXT_PUBLIC_API_BASE=/api/opencode-proxy

# Optional: Allowed origins for CORS (if needed)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

**For local development**: Use `http://localhost:4096` for `OPENCODE_SERVER_URL`

**For production/Docker**: Use internal Docker network URL like `http://opencode-server:4096`

### 4. Run Development Server

```bash
bun run dev
# or
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📱 Mobile Access

To access from mobile devices:

1. Ensure your phone is on the same WiFi network
2. Find your computer's local IP address
3. Access via `http://YOUR_COMPUTER_IP:3000`

**Note**: With the proxy architecture, the OpenCode server stays on localhost:4096 (internal only). Only the Next.js app (port 3000) needs network access.

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

## 🔧 SDK Integration

The app integrates with OpenCode through the official SDK. Key features include:

### Session Management
- Create new coding sessions
- List and switch between sessions
- Real-time message updates

### File Operations
- Browse project files
- Search text across codebase
- Read file contents

### Real-time Events
- Server-sent events for live updates
- Real-time chat responses
- Session status updates

### API Routes
- `/api/opencode` - Main API endpoint for OpenCode operations
- `/api/opencode-proxy/[...path]` - Secure proxy layer for all OpenCode SDK requests
- Proper error handling and streaming support
- Path validation and security measures built-in

## 📁 Project Structure

```
src/
├── app/
│   ├── _components/
│   │   └── ui/                          # WebTUI React components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── table.tsx
│   │       ├── ui.md                     # Component documentation
│   │       └── ...
│   ├── api/
│   │   ├── opencode/                     # API routes for OpenCode integration
│   │   └── opencode-proxy/[...path]/    # Proxy layer for all SDK requests
│   │       └── route.ts
│   ├── globals.css                       # Global styles with WebTUI imports
│   ├── layout.tsx                        # Root layout
│   └── page.tsx                          # Main page component
├── lib/
│   ├── opencode.ts                       # OpenCode client-side service
│   ├── opencode-client.ts                # Proxy-aware client factory
│   └── opencode-server.ts                # Server-side OpenCode client
└── hooks/
    └── useOpenCode.ts                    # Custom hook for OpenCode operations
```

## 🌐 Network Configuration

### Firewall Settings

Ensure your firewall allows connections on port 4096:

**macOS:**
```bash
sudo pfctl -f /etc/pf.conf
```

**Windows:**
Allow Node.js through Windows Firewall when prompted.

**Linux:**
```bash
sudo ufw allow 4096
```

### Troubleshooting Network Issues

1. **Connection refused**: Verify OpenCode server is running on localhost:4096
2. **Proxy errors**: Check `OPENCODE_SERVER_URL` in `.env.local`
3. **Network timeout**: Ensure Next.js can reach OpenCode server
4. **Path forbidden (403)**: Check allowed paths in proxy route configuration

## 🚀 Deployment

### Development
```bash
bun run dev
```

### Production Build
```bash
bun run build
bun run start
```

### Environment Variables for Production

```bash
# Internal OpenCode server URL (Docker network or localhost)
OPENCODE_SERVER_URL=http://opencode-server:4096

# Client-side proxy endpoint
NEXT_PUBLIC_API_BASE=/api/opencode-proxy

# Allowed origins (optional)
ALLOWED_ORIGINS=https://yourdomain.com
```

### Cloudflare Tunnel Deployment

The proxy architecture works seamlessly with Cloudflare Tunnels:

```yaml
tunnel: <tunnel-id>
ingress:
  - hostname: your-app.com
    service: http://localhost:3000  # Next.js app only
  - service: http_status:404
```

**Important**: Only expose Next.js (port 3000), never expose OpenCode server (port 4096) directly.

## 🔒 Security Considerations

- ✅ **OpenCode server stays internal** - Never exposed to internet
- ✅ **Proxy validates paths** - Only allowed API endpoints are forwarded
- ✅ **No CORS issues** - Same-origin requests through Next.js
- 🔐 **Add authentication** - Implement auth middleware in Next.js for production
- 🔐 **Rate limiting** - Add rate limiting to proxy routes
- 🔐 **Request sanitization** - Proxy validates and sanitizes all requests

### Production Security Checklist

- [ ] Add authentication to Next.js app
- [ ] Implement rate limiting on `/api/opencode-proxy`
- [ ] Use HTTPS for all connections
- [ ] Keep OpenCode server on internal network only
- [ ] Monitor and log proxy requests
- [ ] Consider VPN for additional security

## 🚀 Production Deployment

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
      - OPENCODE_SERVER_URL=http://opencode-server:4096
      - NEXT_PUBLIC_API_BASE=/api/opencode-proxy
    depends_on:
      - opencode-server
```

### Build and Start

```bash
# Build production bundle
bun run build

# Start production server
bun run start
```

## 📚 Additional Resources

- [OpenCode Documentation](https://opencode.ai) - Learn about OpenCode features
- [Next.js Documentation](https://nextjs.org/docs) - Next.js framework documentation
- [WebTUI Documentation](https://github.com/webtui/webtui) - WebTUI CSS library
- [OpenCode SDK Guide](sdk-context.md) - Detailed SDK integration guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This web interface requires an OpenCode server to be running on your development machine. The server handles all AI operations while this web app provides the user interface.
