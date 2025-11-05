# MCP Server Status Display

This document explains how to display MCP server connection status in the OpenCode Web UI.

## Overview

The MCP Status feature allows you to view the status of connected MCP (Model Context Protocol) servers in your OpenCode Web interface. It fetches server status from the `/mcp` API endpoint and displays them with visual status badges.

## API Endpoint

The backend OpenCode server provides:
- **Endpoint**: `GET /mcp`
- **Returns**: `Record<string, "connected" | "failed">`

Example response:
```json
{
  "filesystem": "connected",
  "github": "connected",
  "custom-tool": "failed"
}
```

## Components Added

### 1. HTTP API Function (`src/lib/opencode-http-api.ts`)

```typescript
export async function getMcpStatus() {
  const response = await fetch(buildUrl("/mcp"));
  if (!response.ok) {
    throw new Error(`Failed to get MCP status: ${response.statusText}`);
  }
  return response.json();
}
```

### 2. Server Function (`src/lib/opencode-server-fns.ts`)

```typescript
export const getMcpStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    return httpApi.getMcpStatus();
  },
);
```

### 3. Client Service (`src/lib/opencode-client.ts`)

```typescript
async getMcpStatus() {
  try {
    const response = await serverFns.getMcpStatus();
    return { data: response };
  } catch (error) {
    throw error;
  }
}
```

### 4. Type Definitions (`src/types/opencode.ts`)

```typescript
export type McpServerStatus = "connected" | "failed";

export interface McpStatusResponse {
  [serverName: string]: McpServerStatus;
}
```

### 5. UI Component (`src/app/_components/ui/mcp-status.tsx`)

A reusable React component that displays MCP server status with color-coded badges.

## Usage Examples

### Basic Usage

```tsx
import { McpStatus } from "@/app/_components/ui";
import { openCodeService } from "@/lib/opencode-client";
import { useState, useEffect } from "react";

function MyComponent() {
  const [mcpStatus, setMcpStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const result = await openCodeService.getMcpStatus();
        setMcpStatus(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStatus();
    // Optionally poll for updates
    const interval = setInterval(fetchStatus, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>MCP Server Status</h2>
      <McpStatus 
        mcpStatus={mcpStatus}
        isLoading={loading}
        error={error}
        showLabel={true}
      />
    </div>
  );
}
```

### Adding to Header/Sidebar

You can add the MCP status display to your header or sidebar:

```tsx
// In your main layout component
<div className="header">
  <div className="header-left">
    {/* Other header content */}
  </div>
  <div className="header-right">
    <McpStatus 
      mcpStatus={mcpStatus}
      isLoading={loading}
      className="ml-4"
    />
  </div>
</div>
```

### Styling

The component uses the following CSS classes that you can style:

- `.mcp-status-container` - Main container
- `.mcp-status-loading` - Loading state container
- `.mcp-status-error` - Error state container
- `.mcp-status-empty` - Empty/no servers state
- `.mcp-status-label` - Label text
- `.mcp-status-list` - List of servers
- `.mcp-status-item` - Individual server item
- `.mcp-server-name` - Server name text

Example CSS:

```css
.mcp-status-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mcp-status-list {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.mcp-status-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.mcp-server-name {
  font-weight: 500;
}
```

## Status Badge Colors

The component automatically assigns colors based on status:

- **connected** → Green (success)
- **failed** → Red (error)

## Props Reference

### `McpStatus` Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mcpStatus` | `Record<string, McpServerStatus> \| null` | - | MCP server status data |
| `isLoading` | `boolean` | `false` | Whether data is currently loading |
| `error` | `string \| null` | `null` | Error message if fetch failed |
| `className` | `string` | `""` | Additional CSS classes |
| `showLabel` | `boolean` | `true` | Whether to show "MCP Servers:" label |

## Example Integration Points

Here are suggested places to add MCP status in the OpenCode Web UI:

1. **Desktop Header** (line ~3483 in `src/app/index.tsx`)
   - Add next to session/project info

2. **Mobile Sidebar** (in `MobileSidebar` component)
   - Display in the menu section

3. **Settings/Info Panel**
   - Create a dedicated section for server status

4. **Footer/Status Bar**
   - Add to a bottom status bar if you create one

## Testing

You can test the component with mock data:

```tsx
// Mock data for testing
const mockMcpStatus = {
  "filesystem": "connected",
  "github": "connected",
  "custom-server": "failed"
};

<McpStatus mcpStatus={mockMcpStatus} />
```

## Notes

- The component handles two server states: connected and failed
- If no MCP servers are configured, it displays "None configured"
- The status automatically refreshes if you implement polling
- Uses the existing `StatusBadge` component for consistent styling
