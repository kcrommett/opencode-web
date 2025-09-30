# Theme System Implementation

## Overview
Implemented a fully functional theme switcher with all 22 official OpenCode themes.

## Features

### Built-in Themes
1. **OpenCode** - Official OpenCode theme with peach/orange and blue accents
2. **Tokyo Night** - Based on the Tokyonight theme
3. **Ayu Dark** - Based on the Ayu dark theme
4. **Nord** - Based on the Nord theme with polar night colors
5. **Catppuccin Mocha** - Based on the Catppuccin Mocha theme (default)
6. **Dracula** - Classic Dracula theme with purple and pink
7. **Gruvbox** - Based on the Gruvbox theme
8. **Matrix** - Hacker-style green on black theme
9. **One Dark** - Based on the Atom One Dark theme
10. **Vesper** - Minimalist high contrast theme
11. **Rosé Pine** - Elegant theme with soft colors
12. **Cobalt2** - Vibrant blue theme
13. **Solarized Dark** - Classic Solarized dark palette
14. **Palenight** - Material Palenight theme
15. **Material** - Material Design inspired theme
16. **Monokai** - Classic Monokai theme
17. **GitHub Dark** - GitHub's dark theme
18. **Aura** - Minimal dark theme with purple accents
19. **Synthwave 84** - Retro synthwave aesthetics
20. **Zenburn** - Low contrast comfortable theme
21. **Everforest** - Comfortable green forest theme
22. **Kanagawa** - Inspired by famous Japanese painting

### Implementation Details

#### Files Created
- **`src/lib/themes.ts`** - Theme definitions and utilities
  - Theme interface with color palette
  - All 10 theme definitions
  - `applyTheme()` function to switch themes
  - `getStoredTheme()` to retrieve saved preference
  
- **`src/hooks/useTheme.ts`** - React hook for theme management
  - `currentTheme` state
  - `changeTheme()` function
  - Auto-loads saved theme on mount
  - Persists theme selection to localStorage

#### Files Modified
- **`src/app/page.tsx`**
  - Added theme hook integration
  - Replaced hardcoded colors with CSS variables
  - Enhanced theme dialog with theme preview and color swatches
  - All UI elements now use theme variables

- **`src/app/globals.css`**
  - Added CSS variables for all theme colors
  - Theme variables: `--theme-background`, `--theme-foreground`, etc.
  - Ensures consistent theming across components

### Usage

#### Switching Themes
1. Click "Themes" button in top bar
2. Select a theme from the dialog
3. Theme applies immediately and saves to localStorage

#### For Developers
```typescript
// Use the theme hook
import { useTheme } from '@/hooks/useTheme';

const { currentTheme, changeTheme, themes } = useTheme();

// Change theme
changeTheme('tokyonight');

// Access current theme
console.log(currentTheme); // 'tokyonight'
```

#### CSS Variables Available
- `--theme-background` - Main background
- `--theme-backgroundAlt` - Secondary background
- `--theme-backgroundAccent` - Accent background
- `--theme-foreground` - Main text color
- `--theme-foregroundAlt` - Secondary text color
- `--theme-border` - Border color
- `--theme-primary` - Primary accent (buttons, links)
- `--theme-primaryHover` - Primary hover state
- `--theme-success` - Success state
- `--theme-warning` - Warning state
- `--theme-error` - Error state
- `--theme-muted` - Muted/disabled text

### Theme Persistence
Themes are automatically saved to `localStorage` with key `opencode-theme` and restored on page load.

### Color Palette Preview
The theme dialog shows a preview of the first 5 colors from each theme palette as colored boxes, making it easy to identify themes visually.