# User Preferences Persistence

## Overview
User selections for theme, model, and agent are now persisted across browser sessions using localStorage.

## Persisted Settings

### 1. Theme Selection
- **Key**: `opencode-theme`
- **Type**: String (theme ID)
- **Default**: `catppuccin`
- **Restored**: On page load via `useTheme` hook
- **Location**: `src/hooks/useTheme.ts`

**Example:**
```javascript
localStorage.getItem('opencode-theme') // "tokyonight"
```

### 2. Selected Model
- **Key**: `opencode-selected-model`
- **Type**: JSON object `{ providerID: string, modelID: string, name: string }`
- **Default**: First available model
- **Restored**: When models are loaded in `loadModels()`
- **Location**: `src/hooks/useOpenCode.ts`

**Example:**
```json
{
  "providerID": "anthropic",
  "modelID": "claude-3-5-sonnet-20241022",
  "name": "Claude 3.5 Sonnet"
}
```

### 3. Current Agent
- **Key**: `opencode-current-agent`
- **Type**: JSON object `{ id: string, name: string, description?: string }`
- **Default**: Agent at index 1 (build agent) or first available agent
- **Restored**: When agents are loaded in `loadAgents()`
- **Location**: `src/hooks/useOpenCode.ts`

**Example:**
```json
{
  "id": "build",
  "name": "Build Agent",
  "description": "Agent for building and compiling"
}
```

### 4. Current Session
- **Key**: `opencode-current-session`
- **Type**: String (session ID)
- **Default**: None
- **Restored**: On mount (implementation exists)
- **Location**: `src/hooks/useOpenCode.ts`

**Example:**
```javascript
localStorage.getItem('opencode-current-session') // "session-abc123"
```

## Implementation Details

### Storage Strategy
All preferences are saved to localStorage immediately when changed using React `useEffect` hooks:

```typescript
useEffect(() => {
  if (selectedModel) {
    localStorage.setItem('opencode-selected-model', JSON.stringify(selectedModel));
  }
}, [selectedModel]);
```

### Restoration Strategy
Preferences are restored during initial data loading:

1. **Theme**: Restored immediately on component mount
2. **Model**: Restored after fetching available models from server
3. **Agent**: Restored after fetching available agents from server
4. **Session**: Restored after fetching sessions list

### Fallback Behavior
If a saved preference is invalid (e.g., model no longer available):
- **Theme**: Falls back to `catppuccin`
- **Model**: Falls back to first available model
- **Agent**: Falls back to build agent (index 1) or first agent
- **Session**: Cleared from storage

## User Experience

### On First Visit
- Default theme: Catppuccin Mocha
- Default model: First available from server
- Default agent: Build agent or first available
- Default session: None

### On Subsequent Visits
- Theme: Last selected theme applied immediately
- Model: Last selected model restored once available
- Agent: Last selected agent restored once available
- Session: Last active session (not auto-resumed)

## Browser Compatibility

Uses standard `localStorage` API available in all modern browsers:
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## Privacy Considerations

All data is stored locally in the browser:
- No data sent to external servers
- Cleared when browser data is cleared
- Scoped to the domain
- Accessible only to this application

## Testing

To test persistence:
1. Select a theme, model, and agent
2. Refresh the page
3. Verify selections are maintained

To clear all preferences:
```javascript
localStorage.removeItem('opencode-theme');
localStorage.removeItem('opencode-selected-model');
localStorage.removeItem('opencode-current-agent');
localStorage.removeItem('opencode-current-session');
```

Or clear all at once:
```javascript
localStorage.clear();
```