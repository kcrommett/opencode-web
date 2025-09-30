# Recent Changes

## Session Performance & Persistence (Latest)

### Fixed Issues
1. **Duplicate agent fetches** - Removed redundant health check that called `getAgents()` multiple times
2. **Effect dependency loops** - Fixed React hooks with proper dependency arrays
3. **Slow loading** - Optimized initial load by preventing unnecessary re-renders

### Added Persistence
All user preferences now persist across browser sessions using localStorage:

- **Theme selection** - Saved and restored automatically
- **Model selection** - Remembers your chosen AI model
- **Agent selection** - Remembers your chosen agent
- **Session ID** - Tracks last active session (existing feature)

### Performance Improvements
- Reduced console noise from duplicate API calls
- Faster project and session loading
- More efficient React re-renders with proper memoization

## Theme System

### All 22 Official OpenCode Themes
Added complete theme collection with accurate color palettes:
- OpenCode, Tokyo Night, Ayu, Nord, Catppuccin Mocha
- Dracula, Gruvbox, Matrix, One Dark, Vesper
- Rosé Pine, Cobalt2, Solarized, Palenight, Material
- Monokai, GitHub Dark, Aura, Synthwave 84, Zenburn
- Everforest, Kanagawa

### Theme Features
- Visual color preview swatches in theme dialog
- Instant theme switching
- Persistent theme selection via localStorage

## Bug Fixes
- **Chat messages not rendering** - Fixed missing messages.map() loop
- **Null model handling** - Added proper null checks for selectedModel
- **Theme persistence** - Theme now saved and restored correctly

## Developer Experience
- All builds pass with no lint errors
- TypeScript strict mode compliance
- Proper error handling and fallbacks
- Clear console logging for debugging
