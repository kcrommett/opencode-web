# OpenCode System Themes

OpenCode includes 22 built-in themes, each with full dark and light mode support. Themes are defined in `/packages/tui/internal/theme/themes/*.json`.

## Theme Structure

Each theme defines:

- **Color palette** (`defs`): Base color definitions
- **Semantic colors** (`theme`): UI element mappings with separate dark/light values
- **Categories**: UI colors, diff colors, markdown styling, and syntax highlighting

---

## Main Themes (Featured in UI)

### opencode

**Location**: `packages/tui/internal/theme/themes/opencode.json`

**Dark Mode**:

- Primary: `#fab283` (peach/orange)
- Secondary: `#5c9cf5` (blue)
- Accent: `#9d7cd8` (purple)
- Background: `#0a0a0a` → `#1e1e1e` (dark grays)

**Light Mode**:

- Primary: `#3b7dd8` (blue)
- Secondary: `#7b5bb6` (purple)
- Accent: `#d68c27` (orange)
- Background: `#ffffff` → `#f5f5f5` (light grays)

---

### tokyonight

**Location**: `packages/tui/internal/theme/themes/tokyonight.json`

**Dark Mode**:

- Primary: `#82aaff` (blue)
- Secondary: `#c099ff` (purple)
- Accent: `#ff966c` (orange)
- Background: `#1a1b26` → `#222436` (deep blue-grays)

**Light Mode**:

- Primary: `#2e7de9` (blue)
- Secondary: `#9854f1` (purple)
- Accent: `#b15c00` (orange)
- Background: `#e1e2e7` → `#c8c9ce` (light blue-grays)

---

### ayu

**Location**: `packages/tui/internal/theme/themes/ayu.json`

**Dark Mode Only**:

- Primary: `#59C2FF` (cyan)
- Secondary: `#D2A6FF` (purple)
- Accent: `#E6B450` (yellow)
- Background: `#0B0E14` → `#0F131A` (very dark)
- **Note**: Dark theme optimized, no dedicated light palette

---

### nord

**Location**: `packages/tui/internal/theme/themes/nord.json`

**Dark Mode**:

- Primary: `#88C0D0` (cyan)
- Secondary: `#81A1C1` (blue)
- Accent: `#8FBCBB` (teal)
- Background: `#2E3440` → `#434C5E` (polar night)

**Light Mode**:

- Primary: `#5E81AC` (dark blue)
- Secondary: `#81A1C1` (blue)
- Accent: `#8FBCBB` (teal)
- Background: `#ECEFF4` → `#D8DEE9` (snow storm)

---

### catppuccin

**Location**: `packages/tui/internal/theme/themes/catppuccin.json`

**Dark Mode** (Mocha):

- Primary: `#89b4fa` (blue)
- Secondary: `#cba6f7` (mauve)
- Accent: `#f5c2e7` (pink)
- Background: `#1e1e2e` → `#11111b` (mocha base)

**Light Mode** (Latte):

- Primary: `#1e66f5` (blue)
- Secondary: `#8839ef` (mauve)
- Accent: `#ea76cb` (pink)
- Background: `#eff1f5` → `#dce0e8` (latte base)

---

## Additional Themes

### dracula

**Location**: `packages/tui/internal/theme/themes/dracula.json`

**Colors**:

- Primary: `#bd93f9` (purple)
- Secondary: `#ff79c6` (pink)
- Accent: `#8be9fd` (cyan)
- Background: `#282a36` (dark purple-gray)

---

### gruvbox

**Location**: `packages/tui/internal/theme/themes/gruvbox.json`

**Dark Mode**:

- Primary: `#83a598` (blue bright)
- Secondary: `#d3869b` (purple bright)
- Accent: `#8ec07c` (aqua bright)
- Background: `#282828` (dark brown)

**Light Mode**:

- Primary: `#076678` (blue)
- Secondary: `#8f3f71` (purple)
- Accent: `#427b58` (aqua)
- Background: `#fbf1c7` (cream)

---

### matrix

**Location**: `packages/tui/internal/theme/themes/matrix.json`

**Dark Mode**:

- Primary: `#2eff6a` (rain green)
- Secondary: `#00efff` (cyan)
- Accent: `#c770ff` (purple)
- Background: `#0a0e0a` → `#141c12` (very dark green)

**Light Mode**:

- Primary: `#1cc24b` (green)
- Secondary: `#24f6d9` (teal)
- Accent: `#c770ff` (purple)
- Background: `#eef3ea` (light green tint)

---

### one-dark

**Location**: `packages/tui/internal/theme/themes/one-dark.json`

**Dark Mode**:

- Primary: `#61afef` (blue)
- Secondary: `#c678dd` (purple)
- Accent: `#56b6c2` (cyan)
- Background: `#282c34` (dark gray-blue)

**Light Mode**:

- Primary: `#4078f2` (blue)
- Secondary: `#a626a4` (purple)
- Accent: `#0184bc` (cyan)
- Background: `#fafafa` (white)

---

### vesper

**Location**: `packages/tui/internal/theme/themes/vesper.json`

**Minimalist Theme**:

- Primary: `#FFC799` (orange)
- Secondary: `#99FFE4` (cyan)
- Accent: `#FFC799` (orange)
- Background: `#101010` (near black)
- **Note**: High contrast minimal palette

---

### rosepine

**Location**: `packages/tui/internal/theme/themes/rosepine.json`

**Dark Mode**:

- Primary: `#9ccfd8` (foam)
- Secondary: `#c4a7e7` (iris)
- Accent: `#ebbcba` (rose)
- Background: `#191724` (base)

**Light Mode** (Dawn):

- Primary: `#31748f` (pine)
- Secondary: `#907aa9` (iris adjusted)
- Accent: `#d7827e` (rose adjusted)
- Background: `#faf4ed` (dawn base)

---

### cobalt2

**Location**: `packages/tui/internal/theme/themes/cobalt2.json`

**Dark Mode**:

- Primary: `#0088ff` (blue)
- Secondary: `#9a5feb` (purple)
- Accent: `#2affdf` (mint)
- Background: `#193549` (deep blue)

**Light Mode**:

- Primary: `#0066cc` (blue)
- Secondary: `#7c4dff` (purple)
- Accent: `#00acc1` (cyan)
- Background: `#ffffff` (white)

---

### solarized

**Location**: `packages/tui/internal/theme/themes/solarized.json`

**Dark Mode**:

- Primary: `#268bd2` (blue)
- Secondary: `#6c71c4` (violet)
- Accent: `#2aa198` (cyan)
- Background: `#002b36` (base03)

**Light Mode**:

- Primary: `#268bd2` (blue)
- Secondary: `#6c71c4` (violet)
- Accent: `#2aa198` (cyan)
- Background: `#fdf6e3` (base3)

---

### palenight

**Location**: `packages/tui/internal/theme/themes/palenight.json`

**Dark Mode**:

- Primary: `#82aaff` (blue)
- Secondary: `#c792ea` (purple)
- Accent: `#89ddff` (cyan)
- Background: `#292d3e` (dark purple)

**Light Mode**:

- Primary: `#4976eb` (blue)
- Secondary: `#a854f2` (purple)
- Accent: `#00acc1` (cyan)
- Background: `#fafafa` (white)

---

### material

**Location**: `packages/tui/internal/theme/themes/material.json`

**Dark Mode**:

- Primary: `#82aaff` (blue)
- Secondary: `#c792ea` (purple)
- Accent: `#89ddff` (cyan)
- Background: `#263238` (dark blue-gray)

**Light Mode**:

- Primary: `#6182b8` (blue)
- Secondary: `#7c4dff` (purple)
- Accent: `#39adb5` (cyan)
- Background: `#fafafa` (white)

---

### monokai

**Location**: `packages/tui/internal/theme/themes/monokai.json`

**Dark Mode**:

- Primary: `#66d9ef` (cyan)
- Secondary: `#ae81ff` (purple)
- Accent: `#a6e22e` (green)
- Background: `#272822` (dark gray-green)

**Light Mode**:

- Primary: `#66d9ef` (cyan)
- Secondary: `#ae81ff` (purple)
- Accent: `#a6e22e` (green)
- Background: `#fafafa` (white)

---

### github

**Location**: `packages/tui/internal/theme/themes/github.json`

**Dark Mode**:

- Primary: `#58a6ff` (blue)
- Secondary: `#bc8cff` (purple)
- Accent: `#39c5cf` (cyan)
- Background: `#0d1117` (GitHub dark)

**Light Mode**:

- Primary: `#0969da` (blue)
- Secondary: `#8250df` (purple)
- Accent: `#1b7c83` (cyan)
- Background: `#ffffff` (white)

---

### aura

**Location**: `packages/tui/internal/theme/themes/aura.json`

**Dark Mode Only**:

- Primary: `#a277ff` (purple)
- Secondary: `#f694ff` (pink)
- Accent: `#a277ff` (purple)
- Background: `#0f0f0f` (near black)
- **Note**: Dark-optimized minimal theme

---

### synthwave84

**Location**: `packages/tui/internal/theme/themes/synthwave84.json`

**Dark Mode**:

- Primary: `#36f9f6` (cyan)
- Secondary: `#ff7edb` (pink)
- Accent: `#b084eb` (purple)
- Background: `#262335` (dark purple)

**Light Mode**:

- Primary: `#00bcd4` (cyan)
- Secondary: `#e91e63` (pink)
- Accent: `#9c27b0` (purple)
- Background: `#fafafa` (white)

---

### zenburn

**Location**: `packages/tui/internal/theme/themes/zenburn.json`

**Dark Mode**:

- Primary: `#8cd0d3` (blue)
- Secondary: `#dc8cc3` (magenta)
- Accent: `#93e0e3` (cyan)
- Background: `#3f3f3f` (gray)

**Light Mode**:

- Primary: `#5f7f8f` (muted blue)
- Secondary: `#8f5f8f` (muted magenta)
- Accent: `#5f8f8f` (muted cyan)
- Background: `#ffffef` (cream)

---

### everforest

**Location**: `packages/tui/internal/theme/themes/everforest.json`

**Dark Mode**:

- Primary: `#a7c080` (green)
- Secondary: `#7fbbb3` (teal)
- Accent: `#d699b6` (pink)
- Background: `#2d353b` (dark green-gray)

**Light Mode**:

- Primary: `#8da101` (green)
- Secondary: `#3a94c5` (blue)
- Accent: `#df69ba` (pink)
- Background: `#fdf6e3` (cream)

---

### kanagawa

**Location**: `packages/tui/internal/theme/themes/kanagawa.json`

**Dark Mode**:

- Primary: `#7E9CD8` (crystal blue)
- Secondary: `#957FB8` (oni violet)
- Accent: `#D27E99` (sakura pink)
- Background: `#1F1F28` (sumi ink)

**Light Mode**:

- Primary: `#2D4F67` (wave blue)
- Secondary: `#957FB8` (oni violet)
- Accent: `#D27E99` (sakura pink)
- Background: `#F2E9DE` (light paper)

---

## Usage

Themes can be switched via:

- **CLI**: Configuration in `opencode.json`
- **UI**: Ctrl+T keyboard shortcut (cycles through themes)
- **Context**: `useTheme()` hook in `packages/app/src/context/theme.tsx`

The theme system uses CSS variables (`--theme-*`) generated by `packages/app/scripts/vite-theme-plugin.ts`.
