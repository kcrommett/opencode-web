# OpenCode Web Interface

A modern Next.js web application that provides a user-friendly interface to connect to and interact with the OpenCode server. This web app allows users to access OpenCode's AI-powered code agent from any device, including mobile phones and tablets, through a clean, terminal-inspired UI built with WebTUI components.

## 🚀 Features

- **Cross-Device Access**: Connect to your OpenCode server from any device on your network
- **Terminal-Inspired UI**: Beautiful WebTUI components that bring terminal aesthetics to the web
- **Real-time Chat**: Interactive conversations with the OpenCode AI agent
- **Session Management**: Create and manage multiple coding sessions
- **File Operations**: Browse, read, and search through your codebase
- **Mobile Optimized**: Responsive design that works great on phones and tablets
- **TypeScript Support**: Full type safety and excellent developer experience

## 🏗️ Architecture

```
[Your Computer] ──── OpenCode Server (localhost:4096)
                            │
                            │ HTTP API
                            │
[Phone/Browser] ──── Next.js Web App ──── OpenCode SDK
                            │
                            └── WebTUI Components
```

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
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment

Create a `.env.local` file in the project root:

```bash
# Replace with your computer's local IP address
NEXT_PUBLIC_OPENCODE_URL=http://192.168.1.100:4096
```

**Find your IP address:**
- **macOS/Linux**: `ifconfig | grep inet`
- **Windows**: `ipconfig`
- Look for your local network IP (usually 192.168.x.x or 10.x.x.x)

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📱 Mobile Access

To access from mobile devices:

1. Ensure your phone is on the same WiFi network
2. Find your computer's local IP address
3. Access via `http://YOUR_COMPUTER_IP:3000`

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
- Proper error handling and CORS configuration

## 📁 Project Structure

```
src/
├── app/
│   ├── _components/
│   │   └── ui/           # WebTUI React components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── table.tsx
│   │       ├── ui.md      # Component documentation
│   │       └── ...
│   ├── api/
│   │   └── opencode/     # API routes for OpenCode integration
│   ├── globals.css       # Global styles with WebTUI imports
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page component
├── lib/
│   └── opencode.ts       # OpenCode SDK client configuration
└── hooks/
    └── useOpenCode.ts    # Custom hook for OpenCode operations
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

1. **Connection refused**: Verify OpenCode server is running with `--hostname=0.0.0.0`
2. **CORS errors**: Use the API routes, not direct client calls
3. **Network timeout**: Check firewall settings and network connectivity
4. **IP address issues**: Ensure you're using the correct local network IP

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables for Production
```bash
NEXT_PUBLIC_OPENCODE_URL=http://your-server-ip:4096
```

## 🔒 Security Considerations

- **Never expose OpenCode server to the internet directly**
- Use authentication in your Next.js app for production
- Consider VPN for remote access
- Implement rate limiting on API routes

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
