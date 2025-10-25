# Issue: Custom Commands Not Loading in Autocomplete

## Summary
Custom slash commands defined in `.opencode` config are not appearing in the autocomplete suggestions when typing `/` in the input field. Only the default built-in commands are showing up.

## Timeline
- **Working**: Custom commands were working and appearing in autocomplete approximately 1 hour ago
- **Current State**: Custom commands no longer appear in autocomplete
- **Last Commit**: `6f7b46a` - "working commands" (committed ~1 hour ago)

## Symptoms
1. When typing `/` in the chat input, only 19 default commands appear in autocomplete
2. Custom commands array from context is empty: `Commands from context: []`
3. No errors in console
4. The `loadCommands()` function is never being called
5. The `loadCommands useEffect check` console.log never appears in console

## Investigation Findings

### Key Observations
1. **useOpenCode hook is initializing**: Confirmed by `🔥 useOpenCode hook INITIALIZED` appearing 6 times in console
2. **loadCommands is never called**: Added console.logs to `loadCommands()` function but they never appear
3. **useEffect never fires**: The useEffect that should call `loadCommands()` is not executing

### Code Location: src/hooks/useOpenCode.ts

#### State Initialization (Line 239-240)
```typescript
const [commands, setCommands] = useState<Command[]>([]);
const [commandsLoading, setCommandsLoading] = useState(true);
```

#### useEffect That Should Trigger loadCommands (Line 2267-2271)
```typescript
useEffect(() => {
  console.log("loadCommands useEffect check:", { isHydrated, commandsLoading, commandsLength: commands.length });
  if (isHydrated && !commandsLoading && commands.length === 0) {
    console.log("Calling loadCommands...");
    loadCommands();
  }
}, [isHydrated, loadCommands, commandsLoading, commands.length]);
```

**Problem**: The console.log "loadCommands useEffect check" never appears in the console, which means this useEffect is not running at all.

#### The loadCommands Function (Line 2112-2165)
```typescript
const loadCommands = useCallback(async () => {
  try {
    setCommandsLoading(true);
    const response = await openCodeService.getCommands();
    console.log("getCommands response:", response);  // NEVER LOGS
    const commandsData = response.data as Record<string, unknown> | undefined;
    console.log("commandsData:", commandsData);  // NEVER LOGS
    
    // ... rest of function
  } catch (error) {
    console.error("Failed to load commands:", error);  // NEVER LOGS
    return [];
  } finally {
    setCommandsLoading(false);
  }
}, []);
```

**Problem**: None of the console.logs inside this function ever appear.

### API Endpoint
- Endpoint: `/command` (via `openCodeService.getCommands()`)
- Located in: `src/lib/opencode-http-api.ts:595`
- Expected to return: Object with command definitions from `.opencode` config

### Usage in UI (src/app/index.tsx)

#### Where Commands Are Consumed (Line 1218-1233)
```typescript
const handleInputChange = async (value: string) => {
  setInput(value);
  if (value.startsWith("/")) {
    console.log("Commands from context:", commands);  // LOGS: []
    const customCommandsList: Command[] = (commands || []).map(cmd => ({
      name: cmd.name,
      description: cmd.description || "Custom command",
      category: "custom" as const,
      custom: true,
    }));
    console.log("Custom commands list:", customCommandsList);  // LOGS: []
    const suggestions = getCommandSuggestions(value, customCommandsList);
    console.log("All suggestions:", suggestions);  // LOGS: only default commands
    setCommandSuggestions(suggestions);
    setShowCommandPicker(suggestions.length > 0);
    setSelectedCommandIndex(0);
  } else {
    setShowCommandPicker(false);
  }
```

## Theories

### Theory 1: useEffect Dependencies Issue
The useEffect has these dependencies: `[isHydrated, loadCommands, commandsLoading, commands.length]`

The condition requires:
- `isHydrated === true` 
- `commandsLoading === false`
- `commands.length === 0`

**Initial State**:
- `commandsLoading` starts as `true` (line 240)
- `commands` starts as `[]` (line 239)

**Problem**: If `commandsLoading` never gets set to `false` initially, the useEffect will never fire. But there's no code that sets it to false before `loadCommands()` is called.

### Theory 2: React Strict Mode
The hook initializes 6 times, suggesting React Strict Mode is enabled. This could cause unexpected behavior with the useEffect.

### Theory 3: Conditional Render
The component using `useOpenCode` might be conditionally rendered in a way that prevents the useEffect from running.

### Theory 4: Recent Code Change
Something in the last commit (`6f7b46a`) or uncommitted changes broke the useEffect execution, even though the diff doesn't show obvious changes to the loadCommands logic.

## Console Output Evidence

### From Fresh Page Load (with all debug logs):
```
useOpenCode.ts:218 🔥 useOpenCode hook INITIALIZED
useOpenCode.ts:218 🔥 useOpenCode hook INITIALIZED  
useOpenCode.ts:1535 [LoadProjects] Loaded projects from API: 11
useOpenCode.ts:218 🔥 useOpenCode hook INITIALIZED
useOpenCode.ts:218 🔥 useOpenCode hook INITIALIZED
useOpenCode.ts:218 🔥 useOpenCode hook INITIALIZED
useOpenCode.ts:218 🔥 useOpenCode hook INITIALIZED
index.tsx:1221 Commands from context: []
index.tsx:1228 Custom commands list: []
index.tsx:1230 All suggestions: (19) [{…}, ...]  // Only default commands
```

**Missing**:
- `loadCommands useEffect check` log
- `getCommands response` log
- `commandsData` log
- `Parsed command list` log

## What Needs to be Fixed

1. **Find out why the useEffect is not running** - Even the console.log at the start of the useEffect doesn't execute
2. **Ensure loadCommands gets called** - Either fix the useEffect or call it from somewhere else
3. **Test with the API endpoint** - Verify `/command` endpoint returns the expected data

## Recommended Next Steps

1. Check if there are other useEffects in the same hook that ARE running to compare
2. Look for any recent changes to React version or build config
3. Try calling `loadCommands()` from a different location (e.g., after hydration)
4. Check if the useEffect dependency array is causing issues
5. Look at git history to see what changed between "working" and "broken" state
6. Check if there's a build cache issue

## Environment
- Branch: `config-integration`
- Dev server: Running (`bun run dev`)
- Port: `localhost:3000`
- Last working commit: Likely before `6f7b46a` or the commit was working but something else changed
