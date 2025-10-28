# Migration Guide: Tool Part UI Enhancements

## Overview
This document covers changes made to improve tool call visualization in OpenCode Web, addressing GitHub issue #47.

## Changes Made

### 1. New Type Definitions

#### `ToolPartDetail` Interface (`src/types/opencode.ts`)
A new structured interface for normalized tool call data:

```typescript
export interface ToolPartDetail {
  tool: string;
  status: "pending" | "running" | "completed" | "error";
  input?: unknown;
  output?: unknown;
  error?: {
    message?: string;
    stack?: string;
  };
  state?: {
    status?: string;
    timings?: {
      startTime?: number;
      endTime?: number;
      duration?: number;
    };
  };
  path?: string;
  provider?: string;
}
```

**Backward Compatibility**: The existing `Part` interface remains unchanged. `ToolPartDetail` is an additional structure used internally by normalization helpers.

### 2. New Helper Library (`src/lib/tool-helpers.ts`)

A collection of helper functions for normalizing and formatting tool call data:

- `normalizeToolStatus(part: Part)` - Extract normalized status from various sources
- `extractToolName(part: Part)` - Get tool name with fallback logic
- `extractFilePath(part: Part)` - Extract file path from args or direct fields
- `extractTimings(part: Part)` - Get timing/duration information
- `formatDuration(ms: number)` - Format milliseconds to human-readable string
- `extractError(part: Part)` - Extract error information
- `normalizeToolPart(part: Part)` - Comprehensive normalization to `ToolPartDetail`

**Usage Example**:
```typescript
import { normalizeToolPart, formatDuration } from "@/lib/tool-helpers";

const normalized = normalizeToolPart(part);
console.log(normalized.tool, normalized.status);
```

### 3. Enhanced `ToolPart` Component

The `ToolPart` component has been significantly enhanced with:

- **Better Status Indicators**: Visual icons (✓, ✗, ◦) for completed, error, and pending states
- **File Path Display**: Shows the affected file path when available
- **Duration Display**: Shows execution time in human-readable format
- **Copy to Clipboard**: Buttons to copy input/output payloads
- **Accessible Toggles**: Button-based expand/collapse using proper ARIA attributes
- **Error Details**: Better error display with optional stack trace
- **Overflow Control**: Max height limits with scrolling for large payloads
- **Responsive Layout**: Flex wrapping for narrow viewports

### 4. CSS Updates (`src/app/globals.css`)

Added `.status-card.pending` style:
```css
.status-card.pending {
  background-color: rgb(from var(--theme-muted) r g b / 0.1);
  border-color: rgb(from var(--theme-muted) r g b / 0.3);
}
```

## Migration Steps for Downstream Consumers

### If You're Using `Part` Interface Directly
✅ **No changes required** - The `Part` interface is backward compatible.

### If You're Rendering Tool Parts
Consider using the new helper functions for consistent data normalization:

```typescript
// Before
const toolName = part.tool || "unknown";

// After
import { extractToolName } from "@/lib/tool-helpers";
const toolName = extractToolName(part);
```

### If You're Styling Status Cards
Ensure your CSS includes the new `.status-card.pending` class or use the default theming.

## Testing Checklist

- [ ] Tool calls display correctly in both desktop and mobile layouts
- [ ] Status indicators (pending, running, completed, error) render with appropriate styling
- [ ] Copy buttons work and show feedback
- [ ] Input/output toggles are accessible via keyboard
- [ ] Large payloads scroll correctly without breaking layout
- [ ] File paths display when available
- [ ] Duration formatting is human-readable
- [ ] Error messages and stack traces display properly

## Breaking Changes

**None** - All changes are backward compatible. The `Part` interface remains unchanged, and new functionality is additive.

## Performance Considerations

- Helper functions perform type-safe field extraction with minimal overhead
- Copy-to-clipboard uses native `navigator.clipboard` API
- Max-height constraints prevent layout thrashing with large payloads
- Component uses local state for UI toggles (no context overhead)

## Future Enhancements

Potential areas for future work:
- Syntax highlighting for JSON payloads using `highlight.js`
- Tool metadata caching from `/experimental/tool` endpoint
- Collapsible stack traces with search/filter
- Configurable payload truncation limits per user preference
- Provider icons in the header

## Support

For questions or issues related to these changes:
- Review the plan document: `CONTEXT/PLAN-improve-ui-tool-call-display-2025-10-28.md`
- Check GitHub issue #47: https://github.com/kcrommett/opencode-web/issues/47
- Examine test cases (when added) in `tests/` directory
