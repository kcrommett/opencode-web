# Keyboard Shortcuts with Leader Key Navigation - Implementation Plan

**Issue**: [#37 - Implement keyboard shortcuts with leader key (Space) navigation](https://github.com/kcrommett/opencode-web/issues/37)

**Created**: 2025-01-26

**Status**: Planning Phase

---

## Executive Summary

Implement a comprehensive keyboard shortcut system for OpenCode Web using a Vim/Emacs-style leader key pattern. The Space key will act as the leader when no input element has focus, allowing users to navigate frames, trigger actions, and manage the application efficiently without using a mouse.

### Key Goals

1. **Leader key system**: Space triggers command mode when no input is focused
2. **Frame navigation**: Quick access to all major UI sections (Projects, Sessions, Files, Workspace, etc.)
3. **Secondary actions**: Context-aware actions when a frame is selected (New, Edit)
4. **Focus management**: ESC breaks focus, double ESC interrupts agent
5. **Accessibility**: Full keyboard navigation with visual feedback
6. **Cross-platform**: Works on desktop and mobile where applicable

---

## Technical Context

### Current Keyboard Handling Architecture

The application currently has keyboard event handlers scattered across multiple components:

- **Global handler**: `src/app/index.tsx:93` (document-level keydown listener in `ProjectSelector`)
- **Theme picker**: `src/app/index.tsx:313` (arrow keys, Enter, Escape for theme navigation)
- **Dialog component**: `src/app/_components/ui/dialog.tsx:42` (ESC to close)
- **Session picker**: `src/app/_components/ui/session-picker.tsx:74` (ESC to close)
- **Agent picker**: Similar ESC handling pattern
- **Input handler**: `src/app/index.tsx:1570` (`handleKeyDown` for textarea - Tab, Enter, Arrow keys, ESC)

### Challenges to Address

1. **Event bubbling conflicts**: Multiple components listen for the same keys (particularly ESC)
2. **Focus state tracking**: Need centralized focus management to determine when leader key is active
3. **Modal/dialog interaction**: Leader key should be disabled when dialogs are open
4. **Command chaining**: Leader + Frame + Action requires state machine
5. **Visual feedback**: Users need to see when leader mode is active and which frame is selected

---

## Architecture Design

### 1. Global Keyboard Manager Hook

Create a centralized keyboard shortcut system that coordinates all keyboard interactions.

**File**: `src/hooks/useKeyboardShortcuts.ts` (new file)

```typescript
interface KeyboardState {
  leaderActive: boolean;
  selectedFrame: string | null;
  focusedElement: HTMLElement | null;
  dialogsOpen: boolean;
}

interface KeyboardShortcut {
  key: string;
  handler: () => void;
  requiresLeader?: boolean;
  requiresFrame?: string;
  description: string;
  category: 'navigation' | 'action' | 'global';
}
```

**Responsibilities**:
- Track leader key state
- Monitor focus state (input fields, dialogs, etc.)
- Route keyboard events to appropriate handlers
- Provide state for visual feedback components
- Prevent conflicts with existing keyboard handlers

### 2. Frame State Management

Extend OpenCode context to include frame selection state.

**File**: `src/contexts/OpenCodeContext.tsx`

Add to context:
```typescript
selectedFrame: string | null;
selectFrame: (frame: string | null) => void;
frameActions: Record<string, () => void>;
```

### 3. Visual Feedback Component

Create a non-intrusive indicator for leader mode and frame selection.

**File**: `src/app/_components/ui/keyboard-indicator.tsx` (new file)

Shows:
- Leader mode active (space pressed)
- Currently selected frame
- Available next actions
- Auto-hides after timeout or action

### 4. Event Handler Priority System

Implement event capture/bubbling control to prevent conflicts.

Priority order (highest to lowest):
1. Dialog/Modal ESC handlers
2. Command picker/Mention picker navigation
3. Leader key system
4. Input field handlers
5. Default browser behavior

---

## Keyboard Shortcut Mapping

### Global Actions (No Leader Required)

| Shortcut | Action | Implementation | File Reference |
|----------|--------|----------------|----------------|
| `ESC` | Break focus from current element | `document.activeElement?.blur()` | `src/app/index.tsx` |
| `ESC ESC` | Interrupt/stop agent | Call `handleAbort()` (when nothing focused) | `src/app/index.tsx:706` |

### Leader Key + Frame Navigation

| Shortcut | Frame | Description | Target Component |
|----------|-------|-------------|------------------|
| `Space P` | Projects | Select project frame | Project selector sidebar |
| `Space S` | Sessions | Select sessions frame | Sessions list sidebar |
| `Space F` | Files | Select files frame | Files browser tab |
| `Space W` | Workspace | Select workspace/chat frame | Main chat area |
| `Space M` | Model | Open model selection dialog | Model picker dialog |
| `Space A` | Agent | Open agent selection dialog | Agent picker dialog |
| `Space T` | Themes | Open theme picker | Theme picker dialog |
| `Space C` | Config | Show configuration | Config modal |
| `Space H` | Help | Show help dialog | Help dialog |

### Secondary Actions (When Frame Selected)

| Shortcut | Action | Applies To | Implementation |
|----------|--------|-----------|----------------|
| `N` | New | Projects, Sessions | Trigger "New Project" or "New Session" dialog |
| `E` | Edit | Sessions | Edit session title/settings |
| `D` | Delete | Sessions | Delete selected session |
| `Enter` | Activate | All frames | Focus/open selected frame item |
| `Arrow Up/Down` | Navigate | All frames | Move selection within frame |

---

## Implementation Tasks

### Phase 1: Foundation (Days 1-2)

#### Task 1.1: Create Global Keyboard Manager Hook
- [ ] Create `src/hooks/useKeyboardShortcuts.ts`
- [ ] Implement `KeyboardState` interface and state management
- [ ] Implement leader key detection (Space key down/up tracking)
- [ ] Implement focus detection utilities
  - [ ] `isInputFocused()` - check if input/textarea/contenteditable has focus
  - [ ] `isDialogOpen()` - check if any modal/dialog is currently open
  - [ ] `getFocusedElement()` - get current focused element reference
- [ ] Implement keyboard event router with priority system
- [ ] Add event listener with capture phase control
- [ ] Export hook interface: `useKeyboardShortcuts()`

**Validation**: 
- Leader key toggles state without interfering with input fields
- Focus detection accurately identifies input fields, dialogs, and modals
- Event router correctly prioritizes dialog handlers over leader key

**Code References**:
- Study existing focus handling: `src/app/index.tsx:773-776` (textarea auto-focus)
- Review modal detection patterns: `src/app/index.tsx:480-487` (dialog state)

---

#### Task 1.2: Extend OpenCode Context for Frame State
- [x] Add frame selection state to `src/contexts/OpenCodeContext.tsx`
  - [x] Add `selectedFrame: string | null` to context type (line 4)
  - [x] Add `selectFrame: (frame: string | null) => void` to context type
  - [x] Add `frameActions: Record<string, () => void>` to context type
- [x] Update `src/hooks/useOpenCode.ts` to provide frame state
  - [x] Add `useState` for `selectedFrame`
  - [x] Implement `selectFrame` function with timeout (auto-clear after 3 seconds)
  - [x] Implement `frameActions` registry with actions for each frame
- [x] Add frame state to provider exports

**Validation**:
- Frame state persists correctly when switching frames
- Frame state clears after timeout when no action is taken
- Frame actions registry correctly maps to existing UI actions

**Code References**:
- Context pattern: `src/contexts/OpenCodeContext.tsx:97-125`
- Hook pattern: `src/hooks/useOpenCode.ts`

---

#### Task 1.3: Implement Focus Management System
- [ ] Create `src/lib/focus-manager.ts` utility
- [ ] Implement `FocusManager` class
  - [ ] Track focus stack (for nested focus states)
  - [ ] `pushFocus(element: HTMLElement)` - set focus and track
  - [ ] `popFocus()` - restore previous focus
  - [ ] `clearFocus()` - blur all and reset stack
  - [ ] `isInputActive()` - check if input/textarea/contenteditable focused
  - [ ] `isModalActive()` - check if modal/dialog is open
- [ ] Integrate with keyboard manager hook
- [ ] Add focus state subscribers for visual feedback

**Validation**:
- Focus stack correctly maintains order through multiple focus changes
- `isInputActive()` returns true only for editable elements
- `isModalActive()` correctly detects all dialog types (Dialog, SessionPicker, etc.)

**Code References**:
- Existing focus management: `src/app/index.tsx:759-782` (useEffect for textarea focus)
- Dialog detection: Check for Dialog components in `src/app/index.tsx`

---

### Phase 2: Leader Key System (Days 3-4)

#### Task 2.1: Implement Leader Key Detection
- [x] Add Space key listener to keyboard manager
- [x] Implement leader mode activation
  - [x] Check focus state before activating
  - [x] Prevent activation when input is focused
  - [x] Prevent activation when dialog is open
  - [x] Set `leaderActive = true` on Space down
  - [x] Set timeout for auto-deactivation (3 seconds)
- [x] Implement leader mode deactivation
  - [x] On action execution
  - [x] On ESC key
  - [x] On timeout
  - [x] On focus change to input
- [x] Add state management for leader mode
- [x] Trigger visual feedback on leader activation

**Validation**:
- Space key in input fields types a space (normal behavior)
- Space key outside inputs activates leader mode
- Leader mode deactivates after timeout
- ESC key exits leader mode
- Visual indicator appears when leader is active

**Code References**:
- Key event handling pattern: `src/app/index.tsx:1570` (`handleKeyDown`)

---

undefined

---

#### Task 2.3: Implement Secondary Actions
- [ ] Create action handler for secondary shortcuts (when frame is selected)
- [ ] Implement `N` (New) action
  - [ ] Projects frame: Open new project dialog (`setShowNewProjectForm(true)`)
  - [ ] Sessions frame: Open new session dialog (`setShowNewSessionForm(true)`)
- [ ] Implement `E` (Edit) action
  - [ ] Sessions frame: Enable edit mode for selected session
- [ ] Implement `D` (Delete) action
  - [ ] Sessions frame: Delete selected session (with confirmation)
- [ ] Implement `Enter` (Activate) action
  - [ ] Focus selected element in frame
  - [ ] Open selected file/session/project
- [ ] Implement Arrow Up/Down navigation
  - [ ] Navigate within frame items
  - [ ] Update selection state
  - [ ] Scroll selected item into view

**Validation**:
- Secondary actions only work when correct frame is selected
- Actions correctly trigger corresponding UI operations
- Navigation within frames works smoothly with visual feedback
- Leader mode clears after action execution

**Code References**:
- New session dialog: `src/app/index.tsx:442` (`showNewSessionForm`)
- New project dialog: `src/app/index.tsx:436` (`showNewProjectForm`)
- Session selection: `src/app/index.tsx:1476` (`handleSessionSwitch`)
- File selection: `src/app/index.tsx:1768` (`handleFileSelect`)

---

### Phase 3: Visual Feedback (Days 5-6)

#### Task 3.1: Create Keyboard Indicator Component
- [x] Create `src/app/_components/ui/keyboard-indicator.tsx`
- [x] Design indicator UI
  - [x] Leader mode indicator (e.g., "LEADER MODE: Space")
  - [x] Selected frame indicator (e.g., "Projects (P)")
  - [x] Available actions list
  - [x] Position: bottom-right corner, non-intrusive
- [x] Implement component state management
  - [x] Subscribe to keyboard manager state
  - [x] Update on leader activation/deactivation
  - [x] Update on frame selection
- [x] Add animations
  - [x] Fade in on leader activation
  - [x] Fade out on deactivation
  - [x] Highlight current selection
- [x] Export component

**Validation**:
- Indicator appears when leader is active
- Indicator shows correct available actions
- Indicator disappears on timeout or action
- Animations are smooth and non-distracting

**Code References**:
- Theme picker indicator: `src/app/index.tsx:401-407` (footer with keyboard shortcuts)
- Badge component: `src/app/_components/ui/badge.tsx`

---

#### Task 3.2: Add Frame Selection Visual State
- [ ] Update UI components to show selection state
- [ ] Add selection styling to sidebar sections
  - [ ] Projects selector: `src/app/index.tsx:64-196` (ProjectSelector component)
  - [ ] Sessions list: Sidebar sessions rendering
  - [ ] Files browser: Files tab
- [ ] Implement selection ring/border styling
  - [ ] Use theme primary color for selection
  - [ ] Subtle animation on selection change
- [ ] Add active state classes
  - [ ] `.frame-selected` class for selected frames
  - [ ] `.frame-action-available` for actionable items
- [ ] Update global styles (`src/app/globals.css`)

**Validation**:
- Selected frame has visible border/highlight
- Selection styling uses theme colors correctly
- Styling is consistent across light/dark themes
- Active state is clear but not overwhelming

**Code References**:
- Current selection styling: `src/app/index.tsx:108-116` (ProjectSelector selected state)
- Theme color usage: `src/app/index.tsx:114-117` (CSS custom properties)

---

#### Task 3.3: Implement Toast Notifications for Actions
- [ ] Integrate with existing `showToast` function (from `useOpenCode`)
- [ ] Add toast notifications for keyboard actions
  - [ ] "Leader mode active" (optional, subtle)
  - [ ] "Frame selected: [Frame Name]"
  - [ ] "Action executed: [Action Name]"
- [ ] Configure toast duration (short, 1-2 seconds)
- [ ] Position toasts to not obstruct keyboard indicator

**Validation**:
- Toasts appear for major actions
- Toasts don't interfere with keyboard indicator
- Toast duration is appropriate (not too long)

**Code References**:
- Toast usage: Search for `showToast` in codebase
- Context provider: `src/contexts/OpenCodeContext.tsx:52`

---

### Phase 4: Integration & Conflict Resolution (Day 7)

#### Task 4.1: Integrate Keyboard Manager into Main App
- [x] Import `useKeyboardShortcuts` in `src/app/index.tsx`
- [x] Initialize keyboard manager hook
- [x] Connect keyboard state to UI components
  - [x] Pass `selectedFrame` to relevant components
  - [x] Wire frame actions to existing handlers
- [x] Add keyboard indicator component to layout
- [x] Position indicator (bottom-right, above status bar if present)

**Validation**:
- Keyboard manager initializes without errors
- State flows correctly to UI components
- Indicator appears in correct position
- No performance degradation on key events

**Code References**:
- Main component: `src/app/index.tsx:433` (OpenCodeChatTUI component)
- Hook initialization pattern: `src/app/index.tsx:539-611` (useOpenCodeContext)

---

#### Task 4.2: Resolve Keyboard Event Conflicts
- [x] Audit all existing keyboard handlers
  - [x] `src/app/index.tsx:93` (ProjectSelector ESC)
  - [x] `src/app/index.tsx:313` (ThemePickerDialog arrow keys)
  - [x] `src/app/index.tsx:1570` (handleKeyDown for textarea)
  - [x] `src/app/_components/ui/dialog.tsx:42` (Dialog ESC)
  - [x] `src/app/_components/ui/session-picker.tsx:74` (SessionPicker ESC)
- [x] Implement event priority system
  - [x] Use event capturing for high-priority handlers
  - [x] Use `event.stopPropagation()` where needed
  - [x] Check dialog state before processing leader key
- [x] Refactor conflicting handlers
  - [x] Move ESC handling to centralized manager
  - [x] Coordinate dialog close actions
  - [x] Prevent leader key activation when pickers are open
- [x] Add handler coordination logic
  - [x] Check `showCommandPicker`, `showMentionSuggestions`, `showModelPicker`, etc.
  - [x] Disable leader key when any picker is active

**Validation**:
- ESC correctly closes dialogs (takes priority over leader key)
- Arrow keys in pickers don't trigger frame navigation
- Space in input fields types a space (not leader mode)
- No duplicate event handling
- All existing keyboard functionality still works

**Code References**:
- Existing ESC logic: `src/app/index.tsx:1620-1632`
- Dialog state checks: `src/app/index.tsx:1573-1632` (handleKeyDown conditions)

---

#### Task 4.3: Handle ESC and Double-ESC Logic
- [x] Implement ESC state tracking
  - [x] Track time of last ESC press
  - [x] Detect double ESC within threshold (500ms)
- [x] Implement single ESC behavior
  - [x] If command picker open: close picker
  - [x] If mention suggestions open: close suggestions
  - [x] If dialog open: close dialog
  - [x] If leader mode active: deactivate leader mode
  - [x] Otherwise: blur focused element
- [x] Implement double ESC behavior (desktop only)
  - [x] Check if agent is busy (`currentSessionBusy`)
  - [x] Call `handleAbort()` to interrupt agent
  - [x] Show confirmation toast
- [x] Add mobile detection check
  - [x] Use `isMobile` from `useIsMobile()` hook
  - [x] Disable double ESC on mobile

**Validation**:
- Single ESC closes dialogs and pickers correctly
- Single ESC blurs focused elements
- Double ESC interrupts running agent (desktop only)
- Double ESC does nothing on mobile
- ESC timing threshold works correctly

**Code References**:
- Current ESC logic: `src/app/index.tsx:1620-1632`
- Abort handler: `src/app/index.tsx:706` (`handleAbort`)
- Mobile detection: `src/app/index.tsx:503` (`isMobile`)

---

### Phase 5: Documentation & Help (Day 8)

#### Task 5.1: Update Help Dialog
- [x] Locate help dialog content in `src/app/index.tsx` (around line 3178-3320 based on issue)
- [x] Add new section: "Keyboard Shortcuts"
- [x] Document leader key system
  - [x] Explain Space as leader key
  - [x] Show visual indicator example
- [x] Document all frame navigation shortcuts
  - [x] Create table of `Space + Key` combinations
- [x] Document secondary actions
  - [x] Explain frame selection → action flow
  - [x] List available actions per frame
- [x] Document global shortcuts
  - [x] ESC behavior (single and double)
  - [x] Tab for agent cycling
- [x] Add examples/use cases
  - [x] "Quick switch to files: Space → F"
  - [x] "Create new session: Space → S → N"

**Validation**:
- Help content is clear and comprehensive
- All shortcuts are documented
- Examples are practical and helpful
- Help dialog displays correctly

**Code References**:
- Find help dialog: Search for "help" or "Help" in `src/app/index.tsx`
- Look for Dialog with help content around line 3178-3320

---

#### Task 5.2: Add Inline Keyboard Hints
- [ ] Add keyboard hint badges to UI elements
  - [ ] Project selector: Show "Space P" hint
  - [ ] Session list: Show "Space S" hint
  - [ ] Files tab: Show "Space F" hint
- [ ] Implement hint visibility
  - [ ] Show on hover
  - [ ] Show when leader mode is active
  - [ ] Hide by default to reduce clutter
- [ ] Style hints consistently
  - [ ] Use Badge component
  - [ ] Small, unobtrusive
  - [ ] Use theme colors

**Validation**:
- Hints appear when appropriate
- Hints don't clutter the UI
- Hints are readable and helpful
- Hints use consistent styling

**Code References**:
- Badge component: `src/app/_components/ui/badge.tsx`
- Hover patterns: Check existing hover states in UI components

---

#### Task 5.3: Create README Documentation
- [ ] Add keyboard shortcuts section to project README
- [ ] Create keyboard shortcuts reference card (markdown table)
- [ ] Add GIF/screenshots demonstrating leader key usage
- [ ] Document mobile vs desktop differences
- [ ] Add troubleshooting section
  - [ ] "Leader key not working" → Check if input is focused
  - [ ] "Shortcuts conflicting" → Check browser extensions

**Validation**:
- Documentation is clear and well-formatted
- Screenshots/GIFs illustrate functionality
- Troubleshooting covers common issues

**File**: `README.md` (update existing)

---

### Phase 6: Testing & Polish (Days 9-10)

#### Task 6.1: Manual Testing Across Scenarios
- [ ] Test leader key in all application states
  - [ ] No session active
  - [ ] Session active, idle
  - [ ] Session active, agent running
  - [ ] During message streaming
  - [ ] With various dialogs open
- [ ] Test all frame navigation shortcuts
  - [ ] Verify each shortcut opens correct frame
  - [ ] Verify visual feedback appears
  - [ ] Verify focus moves correctly
- [ ] Test secondary actions
  - [ ] New session, new project
  - [ ] Edit session
  - [ ] Delete session
  - [ ] Arrow navigation in lists
- [ ] Test ESC and double ESC
  - [ ] Single ESC in various contexts
  - [ ] Double ESC to abort agent
  - [ ] Timing sensitivity
- [ ] Test with different themes
  - [ ] Visual feedback visible in all themes
  - [ ] Selection styling works in light/dark modes

**Validation Checklist**:
- [ ] All shortcuts work as documented
- [ ] No conflicts with existing keyboard behavior
- [ ] Visual feedback is clear in all contexts
- [ ] Mobile experience is appropriate (no conflicts)
- [ ] Performance is good (no lag on key events)

---

#### Task 6.2: Edge Case Testing
- [ ] Test rapid key presses
  - [ ] Spam Space key → should handle gracefully
  - [ ] Rapid frame switches → should not break state
- [ ] Test with browser zoom
  - [ ] Indicator positioning correct at different zoom levels
- [ ] Test with small screens
  - [ ] Indicator doesn't obstruct content
  - [ ] Shortcuts still accessible
- [ ] Test with assistive technologies
  - [ ] Screen reader compatibility
  - [ ] Keyboard-only navigation
- [ ] Test browser compatibility
  - [ ] Chrome, Firefox, Safari
  - [ ] Check for key code differences
- [ ] Test with browser extensions
  - [ ] Common extensions (Vimium, etc.) don't conflict
  - [ ] Document known conflicts if any

**Validation**:
- All edge cases handled gracefully
- No crashes or state corruption
- Accessibility maintained
- Cross-browser compatibility confirmed

---

#### Task 6.3: Performance Optimization
- [ ] Audit keyboard event listener performance
  - [ ] Ensure handlers are debounced where appropriate
  - [ ] Remove unnecessary re-renders on key events
- [ ] Optimize state updates
  - [ ] Use `useCallback` for keyboard handlers
  - [ ] Use `useMemo` for derived state
- [ ] Optimize visual feedback rendering
  - [ ] Use CSS transforms for animations (GPU accelerated)
  - [ ] Avoid layout thrashing
- [ ] Add performance monitoring
  - [ ] Log slow keyboard handler execution (dev mode only)
  - [ ] Track state update frequency

**Validation**:
- No perceptible lag on key presses
- Frame rate stays at 60fps during animations
- Memory usage doesn't increase over time
- No unnecessary re-renders

**Code References**:
- Performance patterns: Look for existing `useCallback` and `useMemo` usage in `src/app/index.tsx`

---

#### Task 6.4: Final Polish
- [ ] Review all visual feedback for consistency
  - [ ] Animation timing (200-300ms for smooth feel)
  - [ ] Color consistency with theme system
  - [ ] Size and positioning of indicators
- [ ] Add subtle sound effects (optional)
  - [ ] Leader activation sound
  - [ ] Frame selection sound
  - [ ] Action confirmation sound
  - [ ] Make sounds optional in config
- [ ] Improve error handling
  - [ ] Graceful degradation if keyboard manager fails
  - [ ] User-friendly error messages
  - [ ] Fallback to manual navigation
- [ ] Code cleanup
  - [ ] Remove debug logging
  - [ ] Add comprehensive code comments
  - [ ] Ensure consistent code style
  - [ ] Run linter and fix issues

**Validation**:
- UI feels polished and professional
- No console errors or warnings
- Code is clean and maintainable
- All acceptance criteria met

---

## Acceptance Criteria Verification

### From GitHub Issue #37

- [ ] **Space acts as leader key when no element has focus**
  - Verify: Focus input field → Space types space
  - Verify: Blur input → Space activates leader mode
  
- [ ] **ESC breaks focus from any focused element**
  - Verify: Focus input → ESC → Input is blurred
  - Verify: Focus button → ESC → Button is blurred
  
- [ ] **ESC twice (when nothing has focus) interrupts/stops the agent**
  - Verify: Agent running → ESC ESC → Agent stops
  - Verify: Timing threshold works (500ms)
  - Verify: Desktop only (not on mobile)
  
- [ ] **Frame navigation keys work**
  - [ ] P → Projects
  - [ ] S → Sessions
  - [ ] F → Files
  - [ ] W → Workspace
  - [ ] M → Model Selection
  - [ ] A → Agent Selection
  - [ ] T → Themes
  - [ ] C → Config
  - [ ] H → Help
  
- [ ] **Secondary actions work within frames**
  - [ ] N → New (context-aware: new project/session)
  - [ ] E → Edit (context-aware: edit session)
  
- [ ] **Help dialog updated to include all keyboard shortcuts**
  - Verify: Help dialog shows comprehensive shortcut list
  - Verify: Examples are clear
  
- [ ] **Keyboard shortcuts work consistently across desktop and mobile where applicable**
  - Verify: Desktop shortcuts all work
  - Verify: Mobile handles differently (no double ESC, touch-friendly)
  
- [ ] **Visual feedback shows active frame/selection state**
  - Verify: Leader mode indicator appears
  - Verify: Selected frame is highlighted
  - Verify: Available actions are shown

---

## Code References

### Internal Files (Relative Paths)

#### Main Application
- **Entry point**: `src/app/index.tsx`
- **Root layout**: `src/app/__root.tsx`
- **Router config**: `src/router.tsx`

#### Contexts & Hooks
- **OpenCode context**: `src/contexts/OpenCodeContext.tsx`
- **useOpenCode hook**: `src/hooks/useOpenCode.ts`
- **useTheme hook**: `src/hooks/useTheme.ts`

#### UI Components
- **Dialog**: `src/app/_components/ui/dialog.tsx`
- **Session Picker**: `src/app/_components/ui/session-picker.tsx`
- **Agent Picker**: `src/app/_components/ui/agent-picker.tsx`
- **Badge**: `src/app/_components/ui/badge.tsx`
- **Button**: `src/app/_components/ui/button.tsx`
- **UI Index**: `src/app/_components/ui/index.ts`

#### Utilities
- **Command Parser**: `src/lib/commandParser.ts`
- **Commands**: `src/lib/commands.ts`
- **Breakpoints**: `src/lib/breakpoints.ts`
- **Themes**: `src/lib/themes.ts`

#### Styles
- **Global CSS**: `src/app/globals.css`

### External References (Git URLs)

#### Keyboard Shortcut Libraries (for inspiration)
- **tinykeys**: https://github.com/jamiebuilds/tinykeys
  - Lightweight keyboard shortcut library for the web
  - Good patterns for key combination handling
  
- **Mousetrap**: https://github.com/ccampbell/mousetrap
  - Simple keyboard shortcut library
  - Useful for sequence detection patterns
  
- **react-hotkeys-hook**: https://github.com/JohannesKlauss/react-hotkeys-hook
  - React-specific keyboard hooks
  - Good examples of focus management

#### Leader Key Implementations
- **Vim keybinding references**: https://github.com/vim/vim/tree/master/runtime/doc
  - Official Vim documentation for leader key patterns
  
- **Spacemacs**: https://github.com/syl20bnr/spacemacs
  - Emacs with Space leader key (UI/UX inspiration)
  
- **Which-key.nvim**: https://github.com/folke/which-key.nvim
  - Visual guide for keybindings (visual feedback inspiration)

#### Focus Management
- **focus-trap**: https://github.com/focus-trap/focus-trap
  - Trap focus within a DOM element
  - Useful patterns for modal/dialog focus

- **react-focus-lock**: https://github.com/theKashey/react-focus-lock
  - Focus management for React
  - Good examples of focus stack management

#### Accessibility
- **WAI-ARIA Authoring Practices**: https://github.com/w3c/aria-practices
  - Keyboard interaction patterns
  - Accessibility guidelines for keyboard navigation

---

## Technical Specifications

### API Endpoints

No new API endpoints required. All functionality uses existing OpenCode HTTP API endpoints documented in:
- `CONTEXT/API-ENDPOINTS-DOCUMENTATION.md`

### Data Models

#### KeyboardState

```typescript
interface KeyboardState {
  leaderActive: boolean;          // Is leader key currently active?
  selectedFrame: string | null;   // Currently selected frame (null if none)
  lastEscapeTime: number | null;  // Timestamp of last ESC press (for double ESC)
  focusStack: HTMLElement[];      // Stack of focused elements
}
```

#### KeyboardShortcut

```typescript
interface KeyboardShortcut {
  key: string;                    // Key code (e.g., 'p', 'KeyP')
  requiresLeader: boolean;        // Must Space be pressed first?
  requiresFrame: string | null;   // Must a specific frame be selected?
  handler: () => void;            // Function to execute
  description: string;            // Human-readable description
  category: 'navigation' | 'action' | 'global';
}
```

#### FrameConfig

```typescript
interface FrameConfig {
  id: string;                     // Frame identifier
  name: string;                   // Display name
  shortcut: string;               // Keyboard shortcut (after leader)
  element: HTMLElement | null;    // DOM element reference
  actions: FrameAction[];         // Available actions in this frame
}

interface FrameAction {
  key: string;                    // Action shortcut key
  name: string;                   // Action display name
  handler: () => void;            // Action function
}
```

### Configuration Requirements

No changes to OpenCode server configuration required. All settings are client-side.

Optional client-side config (stored in localStorage):

```typescript
interface KeyboardConfig {
  leaderKey: string;              // Default: 'Space'
  leaderTimeout: number;          // Default: 3000 (ms)
  doubleEscapeThreshold: number;  // Default: 500 (ms)
  enableSounds: boolean;          // Default: false
  enableVisualFeedback: boolean;  // Default: true
}
```

Storage key: `opencode-keyboard-config`

### Integration Points

1. **OpenCode Context** (`src/contexts/OpenCodeContext.tsx`)
   - Add frame state management
   - Export frame selection functions
   
2. **Main App Component** (`src/app/index.tsx`)
   - Initialize keyboard manager
   - Wire keyboard state to UI
   - Add visual indicator component
   
3. **UI Components**
   - Update to reflect selection state
   - Add keyboard hint badges
   - Handle frame selection events

4. **Theme System** (`src/lib/themes.ts`)
   - Ensure selection styling uses theme colors
   - Add keyboard indicator to theme variables if needed

---

## Implementation Order & Dependencies

### Dependency Graph

```
Phase 1: Foundation
├── Task 1.1: Global Keyboard Manager Hook (no dependencies)
├── Task 1.2: Extend OpenCode Context (depends on: none)
└── Task 1.3: Focus Management System (depends on: 1.1)

Phase 2: Leader Key System
├── Task 2.1: Leader Key Detection (depends on: 1.1, 1.3)
├── Task 2.2: Frame Navigation (depends on: 1.2, 2.1)
└── Task 2.3: Secondary Actions (depends on: 2.2)

Phase 3: Visual Feedback
├── Task 3.1: Keyboard Indicator Component (depends on: 2.1, 2.2)
├── Task 3.2: Frame Selection Visual State (depends on: 2.2)
└── Task 3.3: Toast Notifications (depends on: 2.3)

Phase 4: Integration
├── Task 4.1: Integrate into Main App (depends on: Phase 1, Phase 2)
├── Task 4.2: Resolve Conflicts (depends on: 4.1)
└── Task 4.3: ESC Logic (depends on: 4.2)

Phase 5: Documentation
├── Task 5.1: Update Help Dialog (depends on: Phase 4)
├── Task 5.2: Inline Hints (depends on: Phase 3)
└── Task 5.3: README Documentation (depends on: Phase 4)

Phase 6: Testing
├── Task 6.1: Manual Testing (depends on: Phase 5)
├── Task 6.2: Edge Cases (depends on: 6.1)
├── Task 6.3: Performance (depends on: 6.1)
└── Task 6.4: Final Polish (depends on: 6.1, 6.2, 6.3)
```

### Critical Path

1. **Foundation** → **Leader Key System** → **Integration** → **Testing**
2. Visual feedback can be developed in parallel after leader key system is working
3. Documentation should be ongoing throughout development

---

## Validation Criteria

### Per-Task Validation

Each task includes specific validation criteria in the task description above. General validation approach:

1. **Unit-level**: Each function/component works in isolation
2. **Integration-level**: Components work together correctly
3. **User-level**: Feature works from user perspective
4. **Accessibility-level**: Feature works with keyboard-only, screen readers

### Overall Success Criteria

The feature is complete when:

1. **All acceptance criteria are met** (see section above)
2. **All tasks are checked off** in this document
3. **Manual testing passes** (Phase 6, Task 6.1)
4. **No regression** in existing functionality
5. **Documentation is complete** (README, help dialog, code comments)
6. **Code review approval** (if applicable)
7. **Performance is acceptable** (no perceptible lag)

---

## Milestones

### Milestone 1: Foundation Complete (End of Day 2)
- Keyboard manager hook implemented
- Focus management working
- Context extended with frame state
- **Deliverable**: Can detect Space key and track focus state

### Milestone 2: Leader Key Working (End of Day 4)
- Leader mode activates/deactivates correctly
- Frame navigation shortcuts functional
- Secondary actions implemented
- **Deliverable**: Can navigate to any frame using Space + Key

### Milestone 3: Visual Feedback Complete (End of Day 6)
- Keyboard indicator appears correctly
- Frame selection is visually clear
- Styling consistent with theme system
- **Deliverable**: User can see what keyboard shortcuts are available

### Milestone 4: Integration Complete (End of Day 7)
- All conflicts resolved
- ESC logic working correctly
- Integrated into main application
- **Deliverable**: Feature works in real application context

### Milestone 5: Documentation Complete (End of Day 8)
- Help dialog updated
- README includes keyboard shortcuts
- Inline hints added
- **Deliverable**: Users can learn the feature easily

### Milestone 6: Ready for Release (End of Day 10)
- All testing complete
- Performance optimized
- Code polished
- **Deliverable**: Feature is production-ready

---

## Risk Assessment & Mitigation

### High Risk

1. **Keyboard event conflicts with existing handlers**
   - **Mitigation**: Implement priority system and careful event coordination
   - **Contingency**: Use event capturing and stopPropagation strategically
   
2. **Browser compatibility issues with Space key**
   - **Mitigation**: Test across all major browsers early
   - **Contingency**: Provide alternative leader key (e.g., Ctrl+Space)

### Medium Risk

1. **Performance degradation from keyboard event listeners**
   - **Mitigation**: Use debouncing and optimize handlers
   - **Contingency**: Disable feature if performance issues detected
   
2. **Accessibility issues with custom keyboard shortcuts**
   - **Mitigation**: Follow WAI-ARIA guidelines, test with screen readers
   - **Contingency**: Ensure all features remain accessible via mouse/touch

### Low Risk

1. **Visual feedback too intrusive**
   - **Mitigation**: Make indicator subtle, user-configurable
   - **Contingency**: Add config option to disable visual feedback
   
2. **Learning curve for new users**
   - **Mitigation**: Comprehensive documentation and help dialog
   - **Contingency**: Make keyboard shortcuts optional enhancement

---

## Future Enhancements (Out of Scope)

These are potential improvements that are NOT included in this plan but could be considered later:

1. **Customizable shortcuts**: Allow users to remap keyboard shortcuts
2. **Macro recording**: Record and replay sequences of keyboard actions
3. **Command palette**: Fuzzy search for all available commands (like VS Code)
4. **Keyboard shortcut training**: Interactive tutorial for learning shortcuts
5. **Vim-style modes**: Normal/Insert/Visual modes like Vim
6. **Multi-key sequences**: More complex leader key sequences (e.g., Space → g → g for "go to top")

---

## Notes & Decisions

### Design Decisions

1. **Why Space as leader key?**
   - Easily accessible on all keyboards
   - Follows Spacemacs/Doom Emacs convention
   - Large key, hard to miss
   
2. **Why 3-second timeout for leader mode?**
   - Long enough to read available options
   - Short enough to not feel "stuck"
   - User can cancel immediately with ESC
   
3. **Why disable leader key in input fields?**
   - Users expect Space to type a space in text fields
   - Prevents accidental leader activation while typing
   - Follows principle of least surprise

### Technical Decisions

1. **Why centralized keyboard manager?**
   - Avoids conflicts between multiple listeners
   - Single source of truth for keyboard state
   - Easier to debug and maintain
   
2. **Why use React context for frame state?**
   - Consistent with existing state management pattern
   - Easy to access from any component
   - Integrates well with existing OpenCode context

### Open Questions

1. Should we add a configuration UI for keyboard shortcuts?
   - **Decision**: Not in initial implementation (future enhancement)
   
2. Should leader mode be persistent or one-shot?
   - **Decision**: One-shot with timeout (deactivates after action or timeout)
   
3. Should we support chord-style shortcuts (e.g., Ctrl+K Ctrl+B)?
   - **Decision**: Not in initial implementation (start simple)

---

## Success Metrics

### User Experience Metrics

- **Task completion time**: Time to perform common actions (before/after)
  - Target: 30% reduction for keyboard users
  
- **User satisfaction**: Survey rating for keyboard navigation
  - Target: 4.5/5 or higher
  
- **Feature adoption**: % of users who use keyboard shortcuts
  - Target: 20% of active users within 1 month

### Technical Metrics

- **Performance**: Key event handler execution time
  - Target: < 16ms (60fps)
  
- **Code quality**: Lines of code, test coverage
  - Target: > 80% test coverage for keyboard manager
  
- **Bug reports**: Keyboard-related issues reported
  - Target: < 5 bugs in first month after release

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-26 | OpenCode Assistant | Initial plan created based on issue #37 |

---

## Appendix

### Keyboard Shortcut Quick Reference

| Category | Shortcut | Action |
|----------|----------|--------|
| **Global** | ESC | Break focus / Close dialog |
| | ESC ESC | Interrupt agent (desktop only) |
| | Tab | Cycle through agents |
| **Leader + Frame** | Space P | Projects |
| | Space S | Sessions |
| | Space F | Files |
| | Space W | Workspace |
| | Space M | Model picker |
| | Space A | Agent picker |
| | Space T | Themes |
| | Space C | Config |
| | Space H | Help |
| **Frame Actions** | N | New (project/session) |
| | E | Edit (session) |
| | D | Delete (session) |
| | Enter | Activate selection |
| | ↑ / ↓ | Navigate items |

### Glossary

- **Leader Key**: A key that activates a command mode, after which other keys trigger actions
- **Frame**: A major section of the UI (e.g., Projects, Sessions, Files)
- **Secondary Action**: An action available within a selected frame
- **Focus Stack**: LIFO stack tracking focused elements for restoration
- **Double ESC**: Pressing ESC twice within a threshold time
- **Chord**: A sequence of keys pressed in order (not all at once)

---

**End of Plan**
