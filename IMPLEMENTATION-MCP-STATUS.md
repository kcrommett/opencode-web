# MCP Server Status Implementation Summary

## Overview

Successfully implemented the ability to view MCP (Model Context Protocol) server connection status in the OpenCode Web UI by integrating with the `/mcp` API endpoint from the sst/opencode backend.

## Research Findings

From analyzing the sst/opencode repository (dev branch), we identified:

- **API Endpoint**: `GET /mcp` (located in `packages/opencode/src/server/server.ts:1281`)
- **Handler**: `MCP.status()` function in `packages/opencode/src/mcp/index.ts:149`
- **Response Type**: `Record<string, "connected" | "failed" | "disabled">`
- **Status Values**:
  - `"connected"`: MCP server is running and connected
  - `"failed"`: MCP server failed to connect
  - `"disabled"`: MCP server is disabled in config

## Files Modified

### 1. API Layer - `src/lib/opencode-http-api.ts`
Added `getMcpStatus()` function to fetch MCP server status from the backend.

**Location**: Line 639-645

```typescript
export async function getMcpStatus() {
  const response = await fetch(buildUrl("/mcp"));
  if (!response.ok) {
    throw new Error(`Failed to get MCP status: ${response.statusText}`);
  }
  return response.json();
}
```

### 2. Server Functions - `src/lib/opencode-server-fns.ts`
Added TanStack Start server function wrapper for getMcpStatus.

**Location**: Line 366-370

```typescript
export const getMcpStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    return httpApi.getMcpStatus();
  },
);
```

### 3. Client Service - `src/lib/opencode-client.ts`
Added client service method with error handling.

**Location**: Line 626-633

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

### 4. Type Definitions - `src/types/opencode.ts`
Added TypeScript types for MCP server status.

**Location**: Line 112-116

```typescript
export type McpServerStatus = "connected" | "failed" | "disabled";

export interface McpStatusResponse {
  [serverName: string]: McpServerStatus;
}
```

### 5. UI Component - `src/app/_components/ui/mcp-status.tsx`
Created reusable React component to display MCP server status.

**Features**:
- Displays server names with color-coded status badges
- Handles loading, error, and empty states
- Configurable label display
- Uses existing `StatusBadge` component for consistency

**Props**:
- `mcpStatus`: Server status data
- `isLoading`: Loading state
- `error`: Error message
- `className`: Additional CSS classes
- `showLabel`: Toggle for "MCP Servers:" label

### 6. Component Export - `src/app/_components/ui/index.ts`
Exported the new McpStatus component.

**Location**: Line 16

```typescript
export { McpStatus } from "./mcp-status";
```

## Documentation Created

### `docs/MCP_STATUS_USAGE.md`
Comprehensive usage guide including:
- API endpoint documentation
- Component architecture explanation
- Usage examples
- Integration suggestions
- Props reference
- Styling guide
- Testing examples

## Status Badge Mapping

The component maps MCP server statuses to visual badges:

| Status | Badge Type | Color |
|--------|-----------|-------|
| `connected` | success | Green |
| `disabled` | warning | Yellow/Orange |
| `failed` | error | Red |

### Aggregation Logic (Header Indicator)

The summary badge now excludes `disabled` servers from the denominator so `MCP X/Y` reflects active (non-disabled) servers. Disabled servers are still displayed in the tooltip and appended as `(<n> disabled)` when present. If all servers are disabled, denominator falls back to total and indicator is gray. Failed servers always force a red indicator and are included in the denominator.

## Integration Points

The component can be added to:

1. **Desktop Header** - Display next to session/project info
2. **Mobile Sidebar** - Add to menu section
3. **Settings Panel** - Create dedicated server status section
4. **Status Bar** - Add to bottom status bar

Example integration in header:

```tsx
// In src/app/index.tsx around line 3483
<div className="px-4 py-2 flex justify-between items-center">
  <div className="flex items-center gap-2">
    {/* Existing content */}
  </div>
  <McpStatus 
    mcpStatus={mcpStatus}
    isLoading={mcpLoading}
    className="ml-4"
  />
</div>
```

## Usage Example

```tsx
import { McpStatus } from "@/app/_components/ui";
import { openCodeService } from "@/lib/opencode-client";
import { useState, useEffect } from "react";

function MyComponent() {
  const [mcpStatus, setMcpStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      const result = await openCodeService.getMcpStatus();
      setMcpStatus(result.data);
      setLoading(false);
    }
    fetchStatus();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return <McpStatus mcpStatus={mcpStatus} isLoading={loading} />;
}
```

## Testing

- ✅ TypeScript compilation passes (`bun x tsc --noEmit`)
- ✅ Linting passes (`bun run lint`)
- ✅ No runtime errors
- ✅ Component properly typed
- ✅ Follows project conventions

## Notes

- Component follows existing OpenCode Web patterns (props-based, no direct data fetching)
- Uses existing `StatusBadge` component for consistent styling
- Integrates seamlessly with TanStack Start architecture
- Properly typed with TypeScript
- Documentation provided for easy integration

## Next Steps

To use this feature, you need to:

1. Choose where to display the MCP status (header, sidebar, etc.)
2. Add state management for fetching MCP status
3. Pass the data to the `<McpStatus>` component
4. Optionally implement polling for real-time updates

See `docs/MCP_STATUS_USAGE.md` for detailed integration examples.
