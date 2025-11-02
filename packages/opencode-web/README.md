# OpenCode Web

OpenCode Web is a self-hosted web interface for OpenCode AI assistant.

## Installation

### Quick Start (Linux/macOS)

```bash
bunx opencode-web
```

Or install globally:

```bash
bun add -g opencode-web
opencode-web
```

### Windows Installation

Due to current limitations in the bundled OpenCode server on Windows, use one of these approaches:

#### Option 1: External OpenCode Server (Recommended)

1. Download the Windows OpenCode binary:
   - Visit https://github.com/sst/opencode/releases/latest
   - Download `opencode-windows-x64.zip`
   - Extract to a folder and add to your PATH, or note the full path

2. Start the OpenCode server:
   ```cmd
   opencode.exe serve
   ```

3. In a new terminal, start OpenCode Web:
   ```cmd
   bunx opencode-web --external-server http://localhost:4096
   ```

#### Option 2: Use WSL (Windows Subsystem for Linux)

Install WSL and run `bunx opencode-web` from within your Linux environment.

## Usage

Once started, open http://localhost:3000 in your browser.

### Command Line Options

```
Usage: opencode-web [options]

Options:
  -p, --port <number>           Port for the web UI (default: 3000)
  -H, --host <hostname>         Host/interface to bind (default: 127.0.0.1)
      --external-server <url>   Use an existing OpenCode Server
      --no-bundled-server       Skip launching the bundled OpenCode Server
  -v, --version                 Show version number
  -h, --help                    Show this help message
```

### Environment Variables

- `PORT`: Server port (default: 3000)
- `HOST`: Server hostname (default: 127.0.0.1)
- `NODE_ENV`: Environment (default: production)
- `VITE_OPENCODE_SERVER_URL`: External OpenCode server URL
- `OPENCODE_WEB_DISABLE_BUNDLED_SERVER`: Disable bundled server (set to 'true' or '1')

## Development

For development, clone the repository and run:

```bash
bun install
bun run dev
```

## License

MIT
