# OpenCode Web Theme Upstream Alignment Plan

**Created**: 2025-01-24  
**Status**: Not Started  
**Owner**: Development Team

## Executive Summary

This plan outlines the comprehensive alignment of OpenCode Web themes with the upstream `sst/opencode` TUI themes. The goal is to achieve pixel-perfect color matching, add missing themes, expand the theme interface to support all upstream color properties, and ensure future maintainability.

### Key Objectives
1. Expand theme interface from 12 to 40+ color properties
2. Update existing themes with exact upstream color values
3. Add 2 missing upstream themes (Mellow, Night Owl)
4. Implement upstream color structure including diff, markdown, and syntax highlighting
5. Maintain backward compatibility with existing UI components

### Deliverables
- Extended `Theme` interface with all upstream properties
- Updated theme definitions for all 24 themes
- Enhanced CSS variable system
- Updated theme application logic
- Validation tests for color accuracy

---

## Table of Contents

- [1. Context & Background](#1-context--background)
- [2. Technical Analysis](#2-technical-analysis)
- [3. Implementation Plan](#3-implementation-plan)
- [4. Theme-by-Theme Updates](#4-theme-by-theme-updates)
- [5. Testing & Validation](#5-testing--validation)
- [6. Rollout Strategy](#6-rollout-strategy)

---

## 1. Context & Background

### 1.1 Current State

**File**: `src/lib/themes.ts`

The current web implementation has:
- **22 themes** implemented (missing 2 from upstream: `mellow`, `nightowl`)
- **12 color properties** per theme (basic UI colors)
- Simple dark-mode-only color scheme
- No support for diff, markdown, or syntax highlighting colors
- Some color deviations from upstream values

**Current Theme Interface** (`src/lib/themes.ts:1-18`):
```typescript
interface Theme {
  name: string;
  id: string;
  colors: {
    background: string;
    backgroundAlt: string;
    backgroundAccent: string;
    foreground: string;
    foregroundAlt: string;
    border: string;
    primary: string;
    primaryHover: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
  };
}
```

### 1.2 Upstream TUI Structure

**Repository**: `https://github.com/sst/opencode`  
**Path**: `packages/tui/internal/theme/themes/*.json`

Upstream themes feature:
- **24 total themes** (all themes we need to support)
- **40+ color properties** per theme (comprehensive color system)
- Adaptive light/dark variants using `{ "dark": "...", "light": "..." }` structure
- Color reference system via `defs` section
- Categories: core, diff, markdown, syntax highlighting

**Upstream Theme Structure** (JSON format):
```json
{
  "$schema": "https://opencode.ai/theme.json",
  "defs": {
    "darkBase": "#1e1e2e",
    "darkBlue": "#89b4fa",
    ...
  },
  "theme": {
    "primary": { "dark": "darkBlue", "light": "lightBlue" },
    "background": { "dark": "darkBase", "light": "lightBase" },
    ...
  }
}
```

### 1.3 External References

**Upstream Theme Files**:
- Base path: `https://github.com/sst/opencode/blob/dev/packages/tui/internal/theme/themes/`
- All themes: `https://github.com/sst/opencode/tree/dev/packages/tui/internal/theme/themes`
- Theme loader: `https://github.com/sst/opencode/blob/dev/packages/tui/internal/theme/loader.go`
- Theme interface: `https://github.com/sst/opencode/blob/dev/packages/tui/internal/theme/theme.go`

**Raw JSON URLs** (for `gh-prep` or `curl`):
```bash
# Catppuccin
https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/catppuccin.json

# Tokyo Night
https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/tokyonight.json

# All 24 themes (alphabetically):
aura, ayu, catppuccin, cobalt2, dracula, everforest, github, gruvbox,
kanagawa, material, matrix, mellow, monokai, nightowl, nord, one-dark,
opencode, palenight, rosepine, solarized, synthwave84, tokyonight,
vesper, zenburn
```

### 1.4 Theme Inventory Comparison

| Theme | Web | Upstream | Status | Notes |
|-------|-----|----------|--------|-------|
| aura | ✅ | ✅ | Needs update | Color verification required |
| ayu | ✅ | ✅ | Needs update | Color verification required |
| catppuccin | ✅ | ✅ | Needs update | Mostly correct, minor fixes |
| cobalt2 | ✅ | ✅ | Needs update | Color verification required |
| dracula | ✅ | ✅ | Needs update | Mostly correct, minor fixes |
| everforest | ✅ | ✅ | Needs update | Color verification required |
| github | ✅ | ✅ | Needs update | Minor fixes needed |
| gruvbox | ✅ | ✅ | Needs update | Some color deviations |
| kanagawa | ✅ | ✅ | Needs update | Color verification required |
| material | ✅ | ✅ | Needs update | Color verification required |
| matrix | ✅ | ✅ | Needs update | Color verification required |
| **mellow** | ❌ | ✅ | **Missing** | **Needs creation** |
| monokai | ✅ | ✅ | Needs update | Color verification required |
| **nightowl** | ❌ | ✅ | **Missing** | **Needs creation** |
| nord | ✅ | ✅ | Needs update | Color verification required |
| one-dark | ✅ | ✅ | Needs update | Color verification required |
| opencode | ✅ | ✅ | Needs update | Custom theme, verify alignment |
| palenight | ✅ | ✅ | Needs update | Color verification required |
| rosepine | ✅ | ✅ | Needs update | Color verification required |
| solarized | ✅ | ✅ | Needs update | Color verification required |
| synthwave84 | ✅ | ✅ | Needs update | Color verification required |
| tokyonight | ✅ | ✅ | Needs update | Several color deviations |
| vesper | ✅ | ✅ | Needs update | Color verification required |
| zenburn | ✅ | ✅ | Needs update | Color verification required |

**Summary**: 22/24 themes present, 2 missing (mellow, nightowl)

---

## 2. Technical Analysis

### 2.1 Color Property Mapping

**Current (12 properties) → Upstream (40+ properties)**

| Current Property | Upstream Mapping | Notes |
|-----------------|------------------|-------|
| `background` | `background` (dark) | Direct map |
| `backgroundAlt` | `backgroundPanel` (dark) | Semantic change |
| `backgroundAccent` | `backgroundElement` (dark) | Semantic change |
| `foreground` | `text` (dark) | Renamed |
| `foregroundAlt` | `textMuted` (dark) | Semantic change |
| `border` | `border` (dark) | Direct map |
| `primary` | `primary` (dark) | Direct map |
| `primaryHover` | `secondary` or `accent` (dark) | Context-dependent |
| `success` | `success` (dark) | Direct map |
| `warning` | `warning` (dark) | Direct map |
| `error` | `error` (dark) | Direct map |
| `muted` | `textMuted` (dark) | Duplicate/alias |

**New Properties to Add** (28 additional):

**Core Colors** (8):
- `backgroundPanel` - Panel/sidebar background
- `backgroundElement` - Element/component background
- `borderActive` - Active/focused border
- `borderSubtle` - Subtle divider border
- `textMuted` - Muted/secondary text
- `secondary` - Secondary accent color
- `accent` - Accent highlight color
- `info` - Info/notification color

**Diff Colors** (6):
- `diffAdded` - Added line text
- `diffRemoved` - Removed line text
- `diffContext` - Context line text
- `diffAddedBg` - Added line background
- `diffRemovedBg` - Removed line background
- `diffContextBg` - Context line background

**Markdown Colors** (4):
- `markdownHeading` - Heading text
- `markdownLink` - Link color
- `markdownCode` - Inline code color
- `markdownBlockQuote` - Block quote color

**Syntax Highlighting Colors** (4):
- `syntaxComment` - Comment text
- `syntaxKeyword` - Keyword text
- `syntaxString` - String literal text
- `syntaxFunction` - Function name text

**Additional Diff/Markdown** (6):
- `diffHunkHeader` - Diff hunk header
- `diffHighlightAdded` - Highlighted added text
- `diffHighlightRemoved` - Highlighted removed text
- `diffLineNumber` - Line number color
- `diffAddedLineNumberBg` - Added line number background
- `diffRemovedLineNumberBg` - Removed line number background

### 2.2 Key Color Deviations Found

**Tokyo Night**:
- Current `success: "#9ece6a"` → Should be `"#c3e88d"` (darkGreen)
- Current `error: "#ff966c"` → Should be `"#ff757f"` (darkRed)
- Current `backgroundAlt: "#222436"` → Should be `"#1e2030"` (darkStep2)

**Gruvbox**:
- Current `backgroundAlt: "#1d2021"` → Should be `"#3c3836"` (darkBg1)
- All colors need verification against upstream

**GitHub Dark**:
- Current `backgroundAlt: "#161b22"` → Should be `"#010409"` (darkBgAlt)
- Current `muted: "#6e7681"` → Should be `"#8b949e"` (darkFgMuted)

**Dracula**:
- Current `backgroundAlt: "#1e1f29"` → Should be `"#21222c"` (upstream backgroundPanel)

### 2.3 Dependencies

**Internal Files**:
- `src/lib/themes.ts` - Main theme definitions (PRIMARY)
- `src/app/globals.css` - CSS variable declarations
- `src/hooks/useTheme.ts` - Theme application hook
- `src/contexts/OpenCodeContext.tsx` - Theme context provider
- `src/app/_components/ui/` - UI components using theme colors

**External Dependencies**:
- None (pure CSS custom properties)

**Browser Support**:
- CSS Custom Properties (CSS Variables) - IE11+ (not a concern for modern web)
- `localStorage` API - All modern browsers

---

## 3. Implementation Plan

### Phase 1: Interface Extension ✅

**Objective**: Extend the `Theme` interface to support all upstream color properties.

**File**: `src/lib/themes.ts:1-18`

- [ ] **Task 1.1**: Backup current `themes.ts`
  ```bash
  cp src/lib/themes.ts src/lib/themes.ts.backup
  ```

- [ ] **Task 1.2**: Update `Theme` interface with new properties
  - Add 8 core color properties
  - Add 6 diff color properties  
  - Add 4 markdown color properties
  - Add 4 syntax color properties
  - Add 6 additional diff/markdown properties
  
  **Expected Result**: Interface with ~40 color properties total

- [ ] **Task 1.3**: Verify TypeScript compilation
  ```bash
  bun x tsc --noEmit
  ```
  
  **Expected**: Type errors on all existing theme objects (missing new properties)

### Phase 2: Add Missing Themes ✅

**Objective**: Add the 2 missing upstream themes.

**Files**: `src/lib/themes.ts:20-417`

- [ ] **Task 2.1**: Add Mellow theme
  - Fetch from: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/mellow.json`
  - Extract dark variant colors
  - Create theme object with all 40 properties
  - Insert alphabetically in themes object
  
  **Key Colors**:
  ```typescript
  mellow: {
    name: "Mellow",
    id: "mellow",
    colors: {
      background: "#161617",      // dark_bg
      backgroundPanel: "#1b1b1d",  // dark_gray01
      backgroundElement: "#2a2a2d", // dark_gray02
      foreground: "#c9c7cd",       // dark_fg
      primary: "#ea83a5",          // dark_cyan
      // ... (see detailed spec in Phase 4)
    }
  }
  ```

- [ ] **Task 2.2**: Add Night Owl theme
  - Fetch from: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/nightowl.json`
  - Extract dark variant colors
  - Create theme object with all 40 properties
  - Insert alphabetically in themes object
  
  **Key Colors**:
  ```typescript
  nightowl: {
    name: "Night Owl",
    id: "nightowl",
    colors: {
      background: "#011627",       // nightOwlBg
      backgroundPanel: "#0b253a",  // nightOwlPanel
      foreground: "#d6deeb",       // nightOwlFg
      primary: "#82AAFF",          // nightOwlBlue
      // ... (see detailed spec in Phase 4)
    }
  }
  ```

- [ ] **Task 2.3**: Verify new themes compile
  ```bash
  bun x tsc --noEmit
  ```

### Phase 3: Update Existing Themes ✅

**Objective**: Update all 22 existing themes with exact upstream colors and new properties.

**Priority Order** (by popularity/impact):
1. Catppuccin (most popular)
2. Tokyo Night (significant color fixes)
3. Dracula (popular)
4. GitHub Dark (professional)
5. Gruvbox (color fixes needed)
6. All remaining themes

**Process for Each Theme**:

- [ ] **Task 3.1**: Fetch upstream JSON for each theme
- [ ] **Task 3.2**: Extract dark variant colors (upstream uses `{ "dark": "...", "light": "..." }`)
- [ ] **Task 3.3**: Map upstream color references to hex values via `defs` section
- [ ] **Task 3.4**: Update existing 12 properties with correct values
- [ ] **Task 3.5**: Add all 28 new properties with upstream values
- [ ] **Task 3.6**: Verify no breaking changes to existing UI

**See Section 4 for detailed theme-by-theme specifications**

### Phase 4: Update Theme Application Logic ✅

**Objective**: Update theme application to support new CSS variables.

**File**: `src/lib/themes.ts:440-460`

- [ ] **Task 4.1**: Update `applyTheme()` function
  - Existing: Applies 12 CSS variables as `--theme-{property}`
  - Add: Apply all 28 new CSS variables
  - Maintain: Existing WebTUI variable mappings (backward compatibility)
  
  ```typescript
  export function applyTheme(themeId: string): void {
    const theme = themes[themeId] || themes.catppuccin;
    const root = document.documentElement;

    // Apply ALL theme colors (now 40 properties)
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    // Maintain existing WebTUI variable mappings (backward compat)
    root.style.setProperty("--background0", theme.colors.background);
    root.style.setProperty("--background1", theme.colors.backgroundAlt);
    root.style.setProperty("--background2", theme.colors.backgroundAccent);
    root.style.setProperty("--background3", theme.colors.border);
    root.style.setProperty("--foreground0", theme.colors.primary);
    root.style.setProperty("--foreground1", theme.colors.foreground);
    root.style.setProperty("--foreground2", theme.colors.foregroundAlt);

    updateThemeColor(theme.colors.background);
    localStorage.setItem("opencode-theme", themeId);
  }
  ```

- [ ] **Task 4.2**: Test theme switching in browser
  - Open app in browser
  - Switch between multiple themes
  - Verify CSS variables update in DevTools
  - Check for console errors

### Phase 5: Update CSS Variables ✅

**Objective**: Declare all new CSS variables in global stylesheet.

**File**: `src/app/globals.css`

- [ ] **Task 5.1**: Add default values for all 40 theme variables
  - Use Catppuccin as default (current default)
  - Format: `--theme-{property}: {hex};`
  
  ```css
  :root {
    /* Existing variables (12) */
    --theme-background: #1e1e2e;
    --theme-background-alt: #11111b;
    /* ... existing ... */
    
    /* New core colors (8) */
    --theme-background-panel: #181825;
    --theme-background-element: #11111b;
    --theme-border-active: #cba6f7;
    --theme-border-subtle: #585b70;
    --theme-text-muted: #bac2de;
    --theme-secondary: #cba6f7;
    --theme-accent: #f5c2e7;
    --theme-info: #94e2d5;
    
    /* Diff colors (6) */
    --theme-diff-added: #a6e3a1;
    --theme-diff-removed: #f38ba8;
    --theme-diff-context: #9399b2;
    --theme-diff-added-bg: #24312b;
    --theme-diff-removed-bg: #3c2a32;
    --theme-diff-context-bg: #181825;
    
    /* Markdown colors (4) */
    --theme-markdown-heading: #cba6f7;
    --theme-markdown-link: #89b4fa;
    --theme-markdown-code: #a6e3a1;
    --theme-markdown-block-quote: #f9e2af;
    
    /* Syntax colors (4) */
    --theme-syntax-comment: #9399b2;
    --theme-syntax-keyword: #cba6f7;
    --theme-syntax-string: #a6e3a1;
    --theme-syntax-function: #89b4fa;
    
    /* Additional diff/markdown (6) */
    --theme-diff-hunk-header: #fab387;
    --theme-diff-highlight-added: #a6e3a1;
    --theme-diff-highlight-removed: #f38ba8;
    --theme-diff-line-number: #313244;
    --theme-diff-added-line-number-bg: #1e2a25;
    --theme-diff-removed-line-number-bg: #32232a;
  }
  ```

- [ ] **Task 5.2**: Test CSS variable fallbacks
  - Comment out `applyTheme()` call temporarily
  - Verify UI uses default Catppuccin colors
  - Restore `applyTheme()` call

### Phase 6: Documentation & Cleanup ✅

**Objective**: Document changes and clean up temporary files.

- [ ] **Task 6.1**: Update inline comments in `themes.ts`
  - Document color property purposes
  - Add upstream reference URLs
  - Note any deviations or customizations

- [ ] **Task 6.2**: Create theme migration guide (if needed)
  - Document any breaking changes
  - Provide upgrade path for custom themes

- [ ] **Task 6.3**: Remove backup files
  ```bash
  rm src/lib/themes.ts.backup
  ```

- [ ] **Task 6.4**: Update this plan with completion status
  - Mark all tasks complete
  - Note any deviations from plan
  - Document lessons learned

---

## 4. Theme-by-Theme Updates

### 4.1 Priority Themes (Detailed Specifications)

#### 4.1.1 Catppuccin Mocha ⭐

**Status**: Mostly correct, needs expansion  
**Upstream**: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/catppuccin.json`

**Current Issues**:
- ✅ Core colors are correct
- ❌ Missing 28 new properties

**Complete Color Specification**:

```typescript
catppuccin: {
  name: "Catppuccin Mocha",
  id: "catppuccin",
  colors: {
    // Existing colors (verified correct) ✅
    background: "#1e1e2e",           // darkBase
    backgroundAlt: "#11111b",         // darkCrust (keep for compatibility)
    backgroundAccent: "#313244",      // darkSurface0
    foreground: "#cdd6f4",            // darkText
    foregroundAlt: "#bac2de",         // darkSubtext1
    border: "#45475a",                // darkSurface1 (updated)
    primary: "#89b4fa",               // darkBlue
    primaryHover: "#cba6f7",          // darkMauve
    success: "#a6e3a1",               // darkGreen
    warning: "#f9e2af",               // darkYellow
    error: "#f38ba8",                 // darkRed
    muted: "#6c7086",                 // darkOverlay0
    
    // New core colors (8) ⭐
    backgroundPanel: "#181825",       // darkMantle
    backgroundElement: "#11111b",     // darkCrust
    borderActive: "#89b4fa",          // darkBlue (updated to match primary)
    borderSubtle: "#585b70",          // darkSurface2
    textMuted: "#bac2de",             // darkSubtext1
    secondary: "#cba6f7",             // darkMauve
    accent: "#f5c2e7",                // darkPink
    info: "#94e2d5",                  // darkTeal
    
    // Diff colors (6) ⭐
    diffAdded: "#a6e3a1",             // darkGreen
    diffRemoved: "#f38ba8",           // darkRed
    diffContext: "#9399b2",           // darkOverlay2
    diffAddedBg: "#24312b",           // custom (from upstream)
    diffRemovedBg: "#3c2a32",         // custom (from upstream)
    diffContextBg: "#181825",         // darkMantle
    
    // Markdown colors (4) ⭐
    markdownHeading: "#cba6f7",       // darkMauve
    markdownLink: "#89b4fa",          // darkBlue
    markdownCode: "#a6e3a1",          // darkGreen
    markdownBlockQuote: "#f9e2af",    // darkYellow
    
    // Syntax colors (4) ⭐
    syntaxComment: "#9399b2",         // darkOverlay2
    syntaxKeyword: "#cba6f7",         // darkMauve
    syntaxString: "#a6e3a1",          // darkGreen
    syntaxFunction: "#89b4fa",        // darkBlue
    
    // Additional diff/markdown (6) ⭐
    diffHunkHeader: "#fab387",        // darkPeach
    diffHighlightAdded: "#a6e3a1",    // darkGreen
    diffHighlightRemoved: "#f38ba8",  // darkRed
    diffLineNumber: "#313244",        // darkSurface0
    diffAddedLineNumberBg: "#1e2a25", // custom (from upstream)
    diffRemovedLineNumberBg: "#32232a", // custom (from upstream)
  },
}
```

**Validation**:
- [ ] All 40 properties defined
- [ ] Colors match upstream JSON dark variants
- [ ] No TypeScript errors
- [ ] Visual test in browser

---

#### 4.1.2 Tokyo Night ⭐

**Status**: Several color deviations, needs fixes  
**Upstream**: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/tokyonight.json`

**Current Issues**:
- ❌ `success: "#9ece6a"` should be `"#c3e88d"` (darkGreen)
- ❌ `error: "#ff966c"` should be `"#ff757f"` (darkRed)  
- ❌ `backgroundAlt: "#222436"` should be `"#1e2030"` (darkStep2)
- ❌ `foreground: "#c0caf5"` should be `"#c8d3f5"` (darkStep12)
- ❌ Missing 28 new properties

**Complete Color Specification**:

```typescript
tokyonight: {
  name: "Tokyo Night",
  id: "tokyonight",
  colors: {
    // Updated existing colors ✅
    background: "#1a1b26",           // darkStep1
    backgroundAlt: "#1e2030",         // darkStep2 ⚠️ CHANGED
    backgroundAccent: "#222436",      // darkStep3
    foreground: "#c8d3f5",            // darkStep12 ⚠️ CHANGED
    foregroundAlt: "#828bb8",         // darkStep11
    border: "#737aa2",                // darkStep7
    primary: "#82aaff",               // darkStep9
    primaryHover: "#c099ff",          // darkPurple
    success: "#c3e88d",               // darkGreen ⚠️ CHANGED
    warning: "#ffc777",               // darkYellow
    error: "#ff757f",                 // darkRed ⚠️ CHANGED
    muted: "#828bb8",                 // darkStep11
    
    // New core colors (8) ⭐
    backgroundPanel: "#1e2030",       // darkStep2
    backgroundElement: "#222436",     // darkStep3
    borderActive: "#9099b2",          // darkStep8
    borderSubtle: "#545c7e",          // darkStep6
    textMuted: "#828bb8",             // darkStep11
    secondary: "#c099ff",             // darkPurple
    accent: "#ff966c",                // darkOrange
    info: "#82aaff",                  // darkStep9
    
    // Diff colors (6) ⭐
    diffAdded: "#4fd6be",             // from upstream
    diffRemoved: "#c53b53",           // from upstream
    diffContext: "#828bb8",           // darkStep11
    diffAddedBg: "#20303b",           // from upstream
    diffRemovedBg: "#37222c",         // from upstream
    diffContextBg: "#1e2030",         // darkStep2
    
    // Markdown colors (4) ⭐
    markdownHeading: "#c099ff",       // darkPurple
    markdownLink: "#82aaff",          // darkStep9
    markdownCode: "#c3e88d",          // darkGreen
    markdownBlockQuote: "#ffc777",    // darkYellow
    
    // Syntax colors (4) ⭐
    syntaxComment: "#828bb8",         // darkStep11
    syntaxKeyword: "#c099ff",         // darkPurple
    syntaxString: "#c3e88d",          // darkGreen
    syntaxFunction: "#82aaff",        // darkStep9
    
    // Additional diff/markdown (6) ⭐
    diffHunkHeader: "#828bb8",        // darkStep11
    diffHighlightAdded: "#b8db87",    // from upstream
    diffHighlightRemoved: "#e26a75",  // from upstream
    diffLineNumber: "#222436",        // darkStep3
    diffAddedLineNumberBg: "#1b2b34", // from upstream
    diffRemovedLineNumberBg: "#2d1f26", // from upstream
  },
}
```

**Validation**:
- [ ] All 40 properties defined
- [ ] Color fixes applied (success, error, backgroundAlt, foreground)
- [ ] Colors match upstream JSON dark variants
- [ ] No TypeScript errors
- [ ] Visual test in browser

---

#### 4.1.3 Dracula ⭐

**Status**: Minor fixes needed  
**Upstream**: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/dracula.json`

**Current Issues**:
- ❌ `backgroundAlt: "#1e1f29"` should be `"#21222c"` (backgroundPanel from upstream)
- ❌ Missing 28 new properties

**Complete Color Specification**:

```typescript
dracula: {
  name: "Dracula",
  id: "dracula",
  colors: {
    // Updated existing colors ✅
    background: "#282a36",            // background
    backgroundAlt: "#21222c",         // backgroundPanel ⚠️ CHANGED
    backgroundAccent: "#44475a",      // currentLine
    foreground: "#f8f8f2",            // foreground
    foregroundAlt: "#6272a4",         // comment
    border: "#44475a",                // currentLine
    primary: "#bd93f9",               // purple
    primaryHover: "#ff79c6",          // pink
    success: "#50fa7b",               // green
    warning: "#f1fa8c",               // yellow
    error: "#ff5555",                 // red
    muted: "#6272a4",                 // comment
    
    // New core colors (8) ⭐
    backgroundPanel: "#21222c",       // from upstream
    backgroundElement: "#44475a",     // currentLine
    borderActive: "#bd93f9",          // purple
    borderSubtle: "#191a21",          // from upstream
    textMuted: "#6272a4",             // comment
    secondary: "#ff79c6",             // pink
    accent: "#8be9fd",                // cyan
    info: "#ffb86c",                  // orange
    
    // Diff colors (6) ⭐
    diffAdded: "#50fa7b",             // green
    diffRemoved: "#ff5555",           // red
    diffContext: "#6272a4",           // comment
    diffAddedBg: "#1a3a1a",           // from upstream
    diffRemovedBg: "#3a1a1a",         // from upstream
    diffContextBg: "#21222c",         // backgroundPanel
    
    // Markdown colors (4) ⭐
    markdownHeading: "#bd93f9",       // purple
    markdownLink: "#8be9fd",          // cyan
    markdownCode: "#50fa7b",          // green
    markdownBlockQuote: "#6272a4",    // comment
    
    // Syntax colors (4) ⭐
    syntaxComment: "#6272a4",         // comment
    syntaxKeyword: "#ff79c6",         // pink
    syntaxString: "#f1fa8c",          // yellow
    syntaxFunction: "#50fa7b",        // green
    
    // Additional diff/markdown (6) ⭐
    diffHunkHeader: "#6272a4",        // comment
    diffHighlightAdded: "#50fa7b",    // green
    diffHighlightRemoved: "#ff5555",  // red
    diffLineNumber: "#44475a",        // currentLine
    diffAddedLineNumberBg: "#1a3a1a", // from upstream
    diffRemovedLineNumberBg: "#3a1a1a", // from upstream
  },
}
```

**Validation**:
- [ ] All 40 properties defined
- [ ] backgroundAlt color fixed
- [ ] Colors match upstream JSON
- [ ] No TypeScript errors
- [ ] Visual test in browser

---

#### 4.1.4 GitHub Dark ⭐

**Status**: Minor fixes needed  
**Upstream**: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/github.json`

**Current Issues**:
- ❌ `backgroundAlt: "#161b22"` should be `"#010409"` (darkBgAlt)
- ❌ `muted: "#6e7681"` should be `"#8b949e"` (darkFgMuted)
- ❌ Missing 28 new properties

**Complete Color Specification**:

```typescript
github: {
  name: "GitHub Dark",
  id: "github",
  colors: {
    // Updated existing colors ✅
    background: "#0d1117",           // darkBg
    backgroundAlt: "#010409",         // darkBgAlt ⚠️ CHANGED
    backgroundAccent: "#161b22",      // darkBgPanel
    foreground: "#c9d1d9",            // darkFg
    foregroundAlt: "#8b949e",         // darkFgMuted
    border: "#30363d",                // from upstream
    primary: "#58a6ff",               // darkBlue
    primaryHover: "#bc8cff",          // darkPurple
    success: "#3fb950",               // darkGreen
    warning: "#d29922",               // darkOrange
    error: "#f85149",                 // darkRed
    muted: "#8b949e",                 // darkFgMuted ⚠️ CHANGED
    
    // New core colors (8) ⭐
    backgroundPanel: "#010409",       // darkBgAlt
    backgroundElement: "#161b22",     // darkBgPanel
    borderActive: "#58a6ff",          // darkBlue
    borderSubtle: "#21262d",          // from upstream
    textMuted: "#8b949e",             // darkFgMuted
    secondary: "#bc8cff",             // darkPurple
    accent: "#39c5cf",                // darkCyan
    info: "#d29922",                  // darkOrange
    
    // Diff colors (6) ⭐
    diffAdded: "#3fb950",             // darkGreen
    diffRemoved: "#f85149",           // darkRed
    diffContext: "#8b949e",           // darkFgMuted
    diffAddedBg: "#033a16",           // from upstream
    diffRemovedBg: "#67060c",         // from upstream
    diffContextBg: "#010409",         // darkBgAlt
    
    // Markdown colors (4) ⭐
    markdownHeading: "#58a6ff",       // darkBlue
    markdownLink: "#58a6ff",          // darkBlue
    markdownCode: "#ff7b72",          // darkPink
    markdownBlockQuote: "#8b949e",    // darkFgMuted
    
    // Syntax colors (4) ⭐
    syntaxComment: "#8b949e",         // darkFgMuted
    syntaxKeyword: "#ff7b72",         // darkPink
    syntaxString: "#39c5cf",          // darkCyan
    syntaxFunction: "#bc8cff",        // darkPurple
    
    // Additional diff/markdown (6) ⭐
    diffHunkHeader: "#58a6ff",        // darkBlue
    diffHighlightAdded: "#3fb950",    // darkGreen
    diffHighlightRemoved: "#f85149",  // darkRed
    diffLineNumber: "#484f58",        // from upstream
    diffAddedLineNumberBg: "#033a16", // from upstream
    diffRemovedLineNumberBg: "#67060c", // from upstream
  },
}
```

**Validation**:
- [ ] All 40 properties defined
- [ ] Color fixes applied (backgroundAlt, muted)
- [ ] Colors match upstream JSON dark variants
- [ ] No TypeScript errors
- [ ] Visual test in browser

---

#### 4.1.5 Gruvbox ⭐

**Status**: Several color deviations  
**Upstream**: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/gruvbox.json`

**Current Issues**:
- ❌ `backgroundAlt: "#1d2021"` should be `"#3c3836"` (darkBg1)
- ❌ `border: "#504945"` should be `"#665c54"` (darkBg3)
- ❌ Missing 28 new properties

**Complete Color Specification**:

```typescript
gruvbox: {
  name: "Gruvbox",
  id: "gruvbox",
  colors: {
    // Updated existing colors ✅
    background: "#282828",           // darkBg0
    backgroundAlt: "#3c3836",         // darkBg1 ⚠️ CHANGED
    backgroundAccent: "#504945",      // darkBg2
    foreground: "#ebdbb2",            // darkFg1
    foregroundAlt: "#928374",         // darkGray
    border: "#665c54",                // darkBg3 ⚠️ CHANGED
    primary: "#83a598",               // darkBlueBright
    primaryHover: "#d3869b",          // darkPurpleBright
    success: "#b8bb26",               // darkGreenBright
    warning: "#fabd2f",               // darkYellowBright
    error: "#fb4934",                 // darkRedBright
    muted: "#928374",                 // darkGray
    
    // New core colors (8) ⭐
    backgroundPanel: "#3c3836",       // darkBg1
    backgroundElement: "#504945",     // darkBg2
    borderActive: "#ebdbb2",          // darkFg1
    borderSubtle: "#504945",          // darkBg2
    textMuted: "#928374",             // darkGray
    secondary: "#d3869b",             // darkPurpleBright
    accent: "#8ec07c",                // darkAquaBright
    info: "#fabd2f",                  // darkYellowBright
    
    // Diff colors (6) ⭐
    diffAdded: "#98971a",             // darkGreen
    diffRemoved: "#cc241d",           // darkRed
    diffContext: "#928374",           // darkGray
    diffAddedBg: "#32302f",           // from upstream
    diffRemovedBg: "#322929",         // from upstream
    diffContextBg: "#3c3836",         // darkBg1
    
    // Markdown colors (4) ⭐
    markdownHeading: "#83a598",       // darkBlueBright
    markdownLink: "#8ec07c",          // darkAquaBright
    markdownCode: "#fabd2f",          // darkYellowBright
    markdownBlockQuote: "#928374",    // darkGray
    
    // Syntax colors (4) ⭐
    syntaxComment: "#928374",         // darkGray
    syntaxKeyword: "#fb4934",         // darkRedBright
    syntaxString: "#fabd2f",          // darkYellowBright
    syntaxFunction: "#b8bb26",        // darkGreenBright
    
    // Additional diff/markdown (6) ⭐
    diffHunkHeader: "#689d6a",        // darkAqua
    diffHighlightAdded: "#b8bb26",    // darkGreenBright
    diffHighlightRemoved: "#fb4934",  // darkRedBright
    diffLineNumber: "#665c54",        // darkBg3
    diffAddedLineNumberBg: "#2a2827", // from upstream
    diffRemovedLineNumberBg: "#2a2222", // from upstream
  },
}
```

**Validation**:
- [ ] All 40 properties defined
- [ ] Color fixes applied (backgroundAlt, border)
- [ ] Colors match upstream JSON dark variants
- [ ] No TypeScript errors
- [ ] Visual test in browser

---

### 4.2 New Themes (Detailed Specifications)

#### 4.2.1 Mellow 🆕

**Status**: Missing - needs creation  
**Upstream**: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/mellow.json`

**Complete Color Specification**:

```typescript
mellow: {
  name: "Mellow",
  id: "mellow",
  colors: {
    // Core colors ⭐
    background: "#161617",           // dark_bg
    backgroundAlt: "#1b1b1d",         // dark_gray01
    backgroundAccent: "#2a2a2d",      // dark_gray02
    foreground: "#c9c7cd",            // dark_fg
    foregroundAlt: "#c1c0d4",         // dark_white
    border: "#2a2a2d",                // dark_gray02
    primary: "#ea83a5",               // dark_cyan
    primaryHover: "#aca1cf",          // dark_blue
    success: "#90b99f",               // dark_green
    warning: "#e6b99d",               // dark_yellow
    error: "#f5a191",                 // dark_red
    muted: "#c1c0d4",                 // dark_white
    
    // New core colors (8) ⭐
    backgroundPanel: "#1b1b1d",       // dark_gray01
    backgroundElement: "#2a2a2d",     // dark_gray02
    borderActive: "#1b1b1d",          // dark_gray01
    borderSubtle: "#18181a",          // dark_gray00
    textMuted: "#c1c0d4",             // dark_white
    secondary: "#ea83a5",             // dark_cyan
    accent: "#aca1cf",                // dark_blue
    info: "#aca1cf",                  // dark_blue
    
    // Diff colors (6) ⭐
    diffAdded: "#27272a",             // dark_black
    diffRemoved: "#27272a",           // dark_black
    diffContext: "#c9c7cd",           // dark_fg
    diffAddedBg: "#90b99f",           // dark_green
    diffRemovedBg: "#f5a191",         // dark_red
    diffContextBg: "#18181a",         // dark_gray00
    
    // Markdown colors (4) ⭐
    markdownHeading: "#9998a8",       // dark_gray06
    markdownLink: "#aca1cf",          // dark_blue
    markdownCode: "#9dc6ac",          // dark_bright_green
    markdownBlockQuote: "#18181a",    // dark_gray00
    
    // Syntax colors (4) ⭐
    syntaxComment: "#757581",         // dark_gray05
    syntaxKeyword: "#aca1cf",         // dark_blue
    syntaxString: "#90b99f",          // dark_green
    syntaxFunction: "#c1c0d4",        // dark_gray07
    
    // Additional diff/markdown (6) ⭐
    diffHunkHeader: "#e29eca",        // dark_magenta
    diffHighlightAdded: "#9dc6ac",    // dark_bright_green
    diffHighlightRemoved: "#ffae9f",  // dark_bright_red
    diffLineNumber: "#18181a",        // dark_gray00 (diffContextBg)
    diffAddedLineNumberBg: "#90b99f", // dark_green
    diffRemovedLineNumberBg: "#f5a191", // dark_red
  },
}
```

**Insert Location**: After `"matrix"` in alphabetical order

**Validation**:
- [ ] All 40 properties defined
- [ ] Colors match upstream JSON (note: uses references, not dark/light)
- [ ] Inserted in correct alphabetical position
- [ ] No TypeScript errors
- [ ] Visual test in browser

---

#### 4.2.2 Night Owl 🆕

**Status**: Missing - needs creation  
**Upstream**: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/nightowl.json`

**Complete Color Specification**:

```typescript
nightowl: {
  name: "Night Owl",
  id: "nightowl",
  colors: {
    // Core colors ⭐
    background: "#011627",           // nightOwlBg
    backgroundAlt: "#0b253a",         // nightOwlPanel
    backgroundAccent: "#0b253a",      // nightOwlPanel
    foreground: "#d6deeb",            // nightOwlFg
    foregroundAlt: "#5f7e97",         // nightOwlMuted
    border: "#5f7e97",                // nightOwlMuted
    primary: "#82AAFF",               // nightOwlBlue
    primaryHover: "#7fdbca",          // nightOwlCyan
    success: "#c5e478",               // nightOwlGreen
    warning: "#ecc48d",               // nightOwlYellow
    error: "#EF5350",                 // nightOwlRed
    muted: "#5f7e97",                 // nightOwlMuted
    
    // New core colors (8) ⭐
    backgroundPanel: "#0b253a",       // nightOwlPanel
    backgroundElement: "#0b253a",     // nightOwlPanel
    borderActive: "#82AAFF",          // nightOwlBlue
    borderSubtle: "#5f7e97",          // nightOwlMuted
    textMuted: "#5f7e97",             // nightOwlMuted
    secondary: "#7fdbca",             // nightOwlCyan
    accent: "#c792ea",                // nightOwlPurple
    info: "#82AAFF",                  // nightOwlBlue
    
    // Diff colors (6) ⭐
    diffAdded: "#c5e478",             // nightOwlGreen
    diffRemoved: "#EF5350",           // nightOwlRed
    diffContext: "#5f7e97",           // nightOwlMuted
    diffAddedBg: "#0a2e1a",           // from upstream
    diffRemovedBg: "#2d1b1b",         // from upstream
    diffContextBg: "#0b253a",         // nightOwlPanel
    
    // Markdown colors (4) ⭐
    markdownHeading: "#82AAFF",       // nightOwlBlue
    markdownLink: "#7fdbca",          // nightOwlCyan
    markdownCode: "#c5e478",          // nightOwlGreen
    markdownBlockQuote: "#5f7e97",    // nightOwlMuted
    
    // Syntax colors (4) ⭐
    syntaxComment: "#637777",         // nightOwlGray
    syntaxKeyword: "#c792ea",         // nightOwlPurple
    syntaxString: "#ecc48d",          // nightOwlYellow
    syntaxFunction: "#82AAFF",        // nightOwlBlue
    
    // Additional diff/markdown (6) ⭐
    diffHunkHeader: "#5f7e97",        // nightOwlMuted
    diffHighlightAdded: "#c5e478",    // nightOwlGreen
    diffHighlightRemoved: "#EF5350",  // nightOwlRed
    diffLineNumber: "#5f7e97",        // nightOwlMuted
    diffAddedLineNumberBg: "#0a2e1a", // from upstream
    diffRemovedLineNumberBg: "#2d1b1b", // from upstream
  },
}
```

**Insert Location**: After `"monokai"` in alphabetical order

**Validation**:
- [ ] All 40 properties defined
- [ ] Colors match upstream JSON dark variants
- [ ] Inserted in correct alphabetical position
- [ ] No TypeScript errors
- [ ] Visual test in browser

---

### 4.3 Remaining Themes (Quick Update Template)

**For each remaining theme** (aura, ayu, cobalt2, everforest, kanagawa, material, matrix, monokai, nord, one-dark, opencode, palenight, rosepine, solarized, synthwave84, vesper, zenburn):

**Process**:
1. Fetch upstream JSON: `https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/{theme-id}.json`
2. Extract dark variant colors (or direct colors if no variants)
3. Map color references through `defs` section to hex values
4. Keep existing 12 properties (verify accuracy)
5. Add 28 new properties using upstream mappings
6. Follow the structure from priority themes above

**Template Checklist (per theme)**:
- [ ] Fetch upstream JSON
- [ ] Verify existing 12 colors match upstream
- [ ] Add 8 new core colors
- [ ] Add 6 diff colors
- [ ] Add 4 markdown colors
- [ ] Add 4 syntax colors
- [ ] Add 6 additional diff/markdown colors
- [ ] Test TypeScript compilation
- [ ] Visual validation in browser

---

## 5. Testing & Validation

### 5.1 Unit Tests

**File**: `src/lib/themes.test.ts` (create if doesn't exist)

- [ ] **Test 5.1.1**: Theme interface validation
  ```typescript
  test('all themes have 40 color properties', () => {
    Object.values(themes).forEach(theme => {
      expect(Object.keys(theme.colors).length).toBe(40);
    });
  });
  ```

- [ ] **Test 5.1.2**: Color format validation
  ```typescript
  test('all colors are valid hex codes', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    Object.values(themes).forEach(theme => {
      Object.values(theme.colors).forEach(color => {
        expect(hexRegex.test(color)).toBe(true);
      });
    });
  });
  ```

- [ ] **Test 5.1.3**: Theme count validation
  ```typescript
  test('has exactly 24 themes', () => {
    expect(Object.keys(themes).length).toBe(24);
  });
  ```

### 5.2 Visual Validation

**Manual Testing Checklist**:

- [ ] **Test 5.2.1**: Theme picker displays all 24 themes
- [ ] **Test 5.2.2**: Switching themes updates UI colors
- [ ] **Test 5.2.3**: Theme persistence (reload page)
- [ ] **Test 5.2.4**: Visual comparison with upstream TUI screenshots
  - Test each priority theme (Catppuccin, Tokyo Night, Dracula, GitHub, Gruvbox)
  - Compare against TUI screenshots or running TUI instance

- [ ] **Test 5.2.5**: Color contrast accessibility
  - Use browser DevTools Accessibility panel
  - Verify text contrast ratios meet WCAG AA (4.5:1)

- [ ] **Test 5.2.6**: Component coverage
  - Buttons use primary/secondary colors correctly
  - Borders use border/borderActive correctly
  - Text uses foreground/textMuted correctly
  - Success/warning/error states work

### 5.3 Integration Tests

- [ ] **Test 5.3.1**: CSS variables applied
  ```javascript
  test('applyTheme sets all CSS variables', () => {
    applyTheme('catppuccin');
    const root = document.documentElement;
    const bg = getComputedStyle(root).getPropertyValue('--theme-background');
    expect(bg).toBe('#1e1e2e');
  });
  ```

- [ ] **Test 5.3.2**: localStorage persistence
  ```javascript
  test('theme persists to localStorage', () => {
    applyTheme('dracula');
    expect(localStorage.getItem('opencode-theme')).toBe('dracula');
  });
  ```

### 5.4 Browser Compatibility

**Test Matrix**:

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | [ ] |
| Firefox | Latest | [ ] |
| Safari | Latest | [ ] |
| Edge | Latest | [ ] |

**Test Cases**:
- [ ] CSS variables render correctly
- [ ] Theme switching works
- [ ] localStorage works
- [ ] No console errors

### 5.5 Performance Testing

- [ ] **Test 5.5.1**: Theme switching latency
  - Should be < 100ms
  - Test with Chrome DevTools Performance panel

- [ ] **Test 5.5.2**: Bundle size impact
  ```bash
  bun run build
  # Compare bundle size before/after changes
  # Expected increase: ~2-3KB (additional theme data)
  ```

---

## 6. Rollout Strategy

### 6.1 Pre-Deployment Checklist

- [ ] All 24 themes implemented with 40 properties
- [ ] All tests passing (unit, visual, integration)
- [ ] TypeScript compilation successful
- [ ] Lint checks passing
- [ ] Build successful
- [ ] No console errors or warnings
- [ ] Documentation updated

### 6.2 Deployment Steps

- [ ] **Step 6.2.1**: Create feature branch
  ```bash
  git checkout -b feat/theme-upstream-alignment
  ```

- [ ] **Step 6.2.2**: Commit changes with detailed message
  ```bash
  git add src/lib/themes.ts src/app/globals.css
  git commit -m "feat: align themes with upstream sst/opencode

  - Expand Theme interface from 12 to 40 color properties
  - Update all 22 existing themes with exact upstream colors
  - Add 2 missing themes: Mellow, Night Owl
  - Add support for diff, markdown, and syntax highlighting colors
  - Fix color deviations in Tokyo Night, Gruvbox, GitHub, Dracula
  - Maintain backward compatibility with existing UI

  Closes #XXX"
  ```

- [ ] **Step 6.2.3**: Push branch
  ```bash
  git push origin feat/theme-upstream-alignment
  ```

- [ ] **Step 6.2.4**: Create pull request
  - Title: "feat: Align themes with upstream sst/opencode"
  - Include before/after screenshots for 5 priority themes
  - Link to this plan document
  - Request review from team

- [ ] **Step 6.2.5**: Address review feedback

- [ ] **Step 6.2.6**: Merge to main

- [ ] **Step 6.2.7**: Deploy to production

- [ ] **Step 6.2.8**: Monitor for issues
  - Check error tracking (if available)
  - Monitor user feedback
  - Test production deployment

### 6.3 Rollback Plan

**If issues occur post-deployment**:

- [ ] **Rollback 6.3.1**: Revert commit
  ```bash
  git revert HEAD
  git push origin main
  ```

- [ ] **Rollback 6.3.2**: Restore from backup
  ```bash
  cp src/lib/themes.ts.backup src/lib/themes.ts
  git commit -am "revert: restore previous themes"
  git push origin main
  ```

- [ ] **Rollback 6.3.3**: Document issue
  - Create GitHub issue with error details
  - Note which theme(s) caused problems
  - Plan fix in separate PR

### 6.4 Post-Deployment Monitoring

**First 24 hours**:
- [ ] Monitor error rates
- [ ] Check theme picker usage analytics
- [ ] Verify no visual regressions reported
- [ ] Test theme switching in production

**First week**:
- [ ] Collect user feedback
- [ ] Monitor theme preference distribution
- [ ] Check for any color contrast complaints
- [ ] Verify new themes (Mellow, Night Owl) are used

---

## Appendices

### Appendix A: Color Property Reference

**Core Colors** (12):
- `background` - Main background color
- `backgroundAlt` - Alternative background (compatibility)
- `backgroundAccent` - Accented background areas
- `foreground` - Primary text color
- `foregroundAlt` - Secondary text color
- `border` - Default border color
- `primary` - Primary brand/action color
- `primaryHover` - Primary hover state
- `success` - Success state color
- `warning` - Warning state color
- `error` - Error state color
- `muted` - Muted/disabled color

**Extended Core** (8):
- `backgroundPanel` - Panel/sidebar background
- `backgroundElement` - Individual element background
- `borderActive` - Active/focused border
- `borderSubtle` - Subtle divider border
- `textMuted` - Muted text color
- `secondary` - Secondary accent color
- `accent` - Accent highlight color
- `info` - Informational color

**Diff Colors** (12):
- `diffAdded` - Added line text
- `diffRemoved` - Removed line text
- `diffContext` - Context line text
- `diffAddedBg` - Added line background
- `diffRemovedBg` - Removed line background
- `diffContextBg` - Context line background
- `diffHunkHeader` - Diff hunk header
- `diffHighlightAdded` - Highlighted added text
- `diffHighlightRemoved` - Highlighted removed text
- `diffLineNumber` - Line number color
- `diffAddedLineNumberBg` - Added line number background
- `diffRemovedLineNumberBg` - Removed line number background

**Markdown Colors** (4):
- `markdownHeading` - Heading text
- `markdownLink` - Link color
- `markdownCode` - Inline code color
- `markdownBlockQuote` - Block quote color

**Syntax Colors** (4):
- `syntaxComment` - Comment text
- `syntaxKeyword` - Keyword text
- `syntaxString` - String literal text
- `syntaxFunction` - Function name text

**Total**: 40 properties

### Appendix B: Upstream Color Extraction Guide

**For themes with `{ "dark": "...", "light": "..." }` structure**:

1. Always use the `"dark"` variant value
2. Look up the value in the `defs` section
3. Use the hex code from `defs`

Example (Catppuccin):
```json
{
  "defs": {
    "darkBlue": "#89b4fa"
  },
  "theme": {
    "primary": { "dark": "darkBlue", "light": "lightBlue" }
  }
}
```
Result: `primary: "#89b4fa"`

**For themes with direct color references** (no dark/light):

1. Look up the value directly in `defs`
2. Use the hex code

Example (Mellow):
```json
{
  "defs": {
    "dark_cyan": "#ea83a5"
  },
  "theme": {
    "primary": "dark_cyan"
  }
}
```
Result: `primary: "#ea83a5"`

### Appendix C: Quick Reference Links

**Internal Files**:
- Theme definitions: `src/lib/themes.ts`
- Global CSS: `src/app/globals.css`
- Theme hook: `src/hooks/useTheme.ts`
- Theme context: `src/contexts/OpenCodeContext.tsx`

**External Resources**:
- Upstream themes directory: https://github.com/sst/opencode/tree/dev/packages/tui/internal/theme/themes
- Upstream theme schema: https://opencode.ai/theme.json
- Color extraction script (if needed): Can be created to automate hex value extraction

**Commands**:
```bash
# Fetch all theme JSONs
for theme in aura ayu catppuccin cobalt2 dracula everforest github gruvbox kanagawa material matrix mellow monokai nightowl nord one-dark opencode palenight rosepine solarized synthwave84 tokyonight vesper zenburn; do
  curl -O "https://raw.githubusercontent.com/sst/opencode/dev/packages/tui/internal/theme/themes/${theme}.json"
done

# Typecheck
bun x tsc --noEmit

# Build
bun run build

# Lint
bun run lint

# Test (if available)
bun run test
```

---

## Status Tracking

**Overall Progress**: 0/24 themes complete

### Theme Completion Checklist

**Priority Themes** (5):
- [ ] Catppuccin Mocha
- [ ] Tokyo Night
- [ ] Dracula
- [ ] GitHub Dark
- [ ] Gruvbox

**New Themes** (2):
- [ ] Mellow
- [ ] Night Owl

**Remaining Themes** (17):
- [ ] Aura
- [ ] Ayu
- [ ] Cobalt2
- [ ] Everforest
- [ ] Kanagawa
- [ ] Material
- [ ] Matrix
- [ ] Monokai
- [ ] Nord
- [ ] One Dark
- [ ] OpenCode
- [ ] Palenight
- [ ] Rosé Pine
- [ ] Solarized
- [ ] Synthwave 84
- [ ] Vesper
- [ ] Zenburn

**Phase Completion**:
- [ ] Phase 1: Interface Extension
- [ ] Phase 2: Add Missing Themes
- [ ] Phase 3: Update Existing Themes
- [ ] Phase 4: Update Theme Application Logic
- [ ] Phase 5: Update CSS Variables
- [ ] Phase 6: Documentation & Cleanup

---

## Notes & Decisions

### Decision Log

**2025-01-24**: Initial plan created
- Decided to use dark variants only (web is dark-mode focused)
- Decided to keep existing 12 properties for backward compatibility
- Decided to add 28 new properties in addition to existing ones
- Decided to prioritize 5 most popular themes first

### Open Questions

- [ ] Should we support light mode variants in the future?
- [ ] Should we create a theme builder/editor UI?
- [ ] Should we allow custom theme import from JSON?

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes to UI | High | Maintain existing 12 properties, add new ones |
| Color accuracy issues | Medium | Automated testing + visual comparison |
| Bundle size increase | Low | Monitor build size, acceptable trade-off |
| Browser compatibility | Low | CSS variables widely supported |

---

**End of Plan**

_Last Updated: 2025-01-24_  
_Plan Version: 1.0_
