# OpenCode Web - CSS & Theme Refactoring Plan

## Executive Summary

This plan outlines a comprehensive refactoring of CSS usage across the OpenCode Web application to ensure:
1. **Consistent WebTUI component usage** across all UI elements
2. **Proper theme switching support** using CSS custom properties
3. **Elimination of hard-coded colors** that break theme switching
4. **Mobile-first responsive design** compliance
5. **Accessibility improvements** through proper touch targets and contrast

---

## Current State Analysis

### ✅ What's Working Well

1. **Theme System Foundation**
   - Robust theme system with 20 pre-configured themes (`src/lib/themes.ts`)
   - CSS custom properties properly mapped in `globals.css`
   - `useTheme()` hook working correctly for theme switching
   - Theme persistence via localStorage

2. **WebTUI Integration**
   - Core WebTUI components imported and styled in `globals.css`
   - Custom components wrapping WebTUI: Button, Badge, View, Input, Textarea, etc.
   - Proper use of `is-` attributes for WebTUI components

3. **Utility Classes**
   - Theme-aware utility classes defined in `globals.css` (@layer utilities)
   - Mobile-specific utilities for touch optimization
   - Scrollbar styling consistent with theme

### ❌ Critical Issues Found

#### 1. Hard-Coded Tailwind Colors (Breaking Theme Switching)

**Location: `src/app/index.tsx`**
- Line 1020: `bg-green-500` and `bg-red-500` for connection status
- Message components using hard-coded colors

**Location: `src/app/_components/message/ToolPart.tsx`**
- Line 27: `text-green-500` for success icon
- Line 29: `text-red-500` for error icon
- Lines 38-44: `bg-blue-500/10`, `bg-green-500/10`, `bg-red-500/10` for status backgrounds

**Impact**: These colors don't respond to theme changes and may clash with custom themes.

#### 2. Excessive Inline Styles

**Location: `src/app/index.tsx`** (70+ inline styles)
- Repeated patterns like `style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}`
- Inline color definitions that could be utility classes
- Inconsistent application of theme variables

**Impact**: 
- Harder to maintain
- Larger bundle size
- Difficult to override for accessibility needs

#### 3. Inconsistent Component Usage

**Issues**:
- Plain `<div>` elements where `<View>` component should be used
- Mixing of inline styles and utility classes
- Some components using WebTUI, others using plain HTML

**Impact**: Visual inconsistency across the app

#### 4. Missing Theme Color Mappings

**Current theme colors NOT mapped to utilities**:
- `--theme-success` (only has text utility)
- `--theme-warning` (only has text utility)
- `--theme-error` (only has text utility)
- No hover states for these colors

---

## Refactoring Strategy

### Phase 1: Enhance CSS Foundation (Priority: HIGH)

#### 1.1 Extend Utility Classes in `globals.css`

Add missing theme-aware utilities:

```css
@layer utilities {
  /* Status Background Colors */
  .bg-theme-success { background-color: var(--theme-success) !important; }
  .bg-theme-warning { background-color: var(--theme-warning) !important; }
  .bg-theme-error { background-color: var(--theme-error) !important; }
  
  /* Status Background Colors with Opacity */
  .bg-theme-success\/10 { background-color: rgb(from var(--theme-success) r g b / 0.1) !important; }
  .bg-theme-warning\/10 { background-color: rgb(from var(--theme-warning) r g b / 0.1) !important; }
  .bg-theme-error\/10 { background-color: rgb(from var(--theme-error) r g b / 0.1) !important; }
  .bg-theme-primary\/10 { background-color: rgb(from var(--theme-primary) r g b / 0.1) !important; }
  
  /* Border Colors for Status */
  .border-theme-success { border-color: var(--theme-success) !important; }
  .border-theme-warning { border-color: var(--theme-warning) !important; }
  .border-theme-error { border-color: var(--theme-error) !important; }
  
  /* Border Colors with Opacity */
  .border-theme-success\/30 { border-color: rgb(from var(--theme-success) r g b / 0.3) !important; }
  .border-theme-warning\/30 { border-color: rgb(from var(--theme-warning) r g b / 0.3) !important; }
  .border-theme-error\/30 { border-color: rgb(from var(--theme-error) r g b / 0.3) !important; }
  .border-theme-primary\/30 { border-color: rgb(from var(--theme-primary) r g b / 0.3) !important; }
}
```

#### 1.2 Create Semantic CSS Classes

Add component-specific classes for common patterns:

```css
/* Connection Status Indicator */
.connection-indicator {
  @apply w-2 h-2 rounded-full;
}

.connection-indicator.connected {
  background-color: var(--theme-success);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.connection-indicator.disconnected {
  background-color: var(--theme-error);
}

/* Message Container Backgrounds */
.message-user {
  background-color: var(--theme-backgroundAlt);
}

.message-assistant {
  background-color: var(--theme-background);
}

/* Status Cards */
.status-card {
  border: 1px solid;
  border-radius: 0.375rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.status-card.running {
  background-color: rgb(from var(--theme-primary) r g b / 0.1);
  border-color: rgb(from var(--theme-primary) r g b / 0.3);
}

.status-card.completed {
  background-color: rgb(from var(--theme-success) r g b / 0.1);
  border-color: rgb(from var(--theme-success) r g b / 0.3);
}

.status-card.error {
  background-color: rgb(from var(--theme-error) r g b / 0.1);
  border-color: rgb(from var(--theme-error) r g b / 0.3);
}
```

### Phase 2: Refactor Components (Priority: HIGH)

#### 2.1 Message Components

**File: `src/app/_components/message/ToolPart.tsx`**

Replace hard-coded colors:
```tsx
// OLD:
<span className="text-green-500">✅</span>
<span className="text-red-500">❌</span>

// NEW:
<span className="text-theme-success">✅</span>
<span className="text-theme-error">❌</span>
```

Replace status backgrounds:
```tsx
// OLD:
const getStatusColor = () => {
  switch (status) {
    case 'running': return 'bg-blue-500/10 border-blue-500/30';
    case 'completed': return 'bg-green-500/10 border-green-500/30';
    case 'error': return 'bg-red-500/10 border-red-500/30';
    default: return 'bg-gray-500/10 border-gray-500/30';
  }
};

// NEW:
const getStatusColor = () => {
  switch (status) {
    case 'running': return 'status-card running';
    case 'completed': return 'status-card completed';
    case 'error': return 'status-card error';
    default: return 'status-card';
  }
};
```

**Files to Update:**
- `src/app/_components/message/ToolPart.tsx` - Replace status colors
- `src/app/_components/message/StepPart.tsx` - Check for hard-coded colors
- `src/app/_components/message/ReasoningPart.tsx` - Check for hard-coded colors
- `src/app/_components/message/FilePart.tsx` - Check for hard-coded colors
- `src/app/_components/message/PatchPart.tsx` - Check for hard-coded colors

#### 2.2 Main Application (`src/app/index.tsx`)

**Connection Status (Line ~1020):**
```tsx
// OLD:
<div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />

// NEW:
<div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
```

**Replace Inline Style Patterns:**

Pattern 1 - Background Alt:
```tsx
// OLD:
style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}

// NEW:
className="bg-theme-background-alt"
```

Pattern 2 - Text Color:
```tsx
// OLD:
style={{ color: 'var(--theme-foreground)' }}

// NEW:
className="text-theme-foreground"
```

Pattern 3 - Multiple Properties:
```tsx
// OLD:
style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-foreground)' }}

// NEW:
className="bg-theme-background text-theme-foreground"
```

**Convert div to View components:**

Replace container divs with View for borders:
```tsx
// OLD:
<div className="p-4" style={{ backgroundColor: 'var(--theme-backgroundAlt)' }}>

// NEW:
<View box="square" className="p-4 bg-theme-background-alt">
```

### Phase 3: UI Component Enhancements (Priority: MEDIUM)

#### 3.1 Extend Button Component

Add status variants to `src/app/_components/ui/button.tsx`:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'background0' | 'background1' | 'background2' | 'background3' | 
            'foreground0' | 'foreground1' | 'foreground2' |
            'success' | 'warning' | 'error';  // NEW
  box?: 'square' | 'round' | 'double';
  size?: 'small' | 'large';
  className?: string;
}
```

Add corresponding CSS in `globals.css`:
```css
button[is-="button"][variant-="success"],
[is-="button"][variant-="success"] {
  border-color: var(--theme-success) !important;
  color: var(--theme-success) !important;
}

button[is-="button"][variant-="warning"],
[is-="button"][variant-="warning"] {
  border-color: var(--theme-warning) !important;
  color: var(--theme-warning) !important;
}

button[is-="button"][variant-="error"],
[is-="button"][variant-="error"] {
  border-color: var(--theme-error) !important;
  color: var(--theme-error) !important;
}
```

#### 3.2 Create StatusBadge Component

New file: `src/app/_components/ui/status-badge.tsx`

```tsx
import React from 'react';
import { Badge } from './badge';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  children: React.ReactNode;
  cap?: 'square' | 'round' | 'triangle' | 'ribbon' | 'slant-top' | 'slant-bottom';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  cap = 'round',
  className = ''
}) => {
  const getStatusClass = () => {
    switch (status) {
      case 'success': return 'status-badge-success';
      case 'warning': return 'status-badge-warning';
      case 'error': return 'status-badge-error';
      case 'info': return 'status-badge-info';
      default: return 'status-badge-pending';
    }
  };

  return (
    <Badge cap={cap} className={`${getStatusClass()} ${className}`}>
      {children}
    </Badge>
  );
};
```

With CSS:
```css
/* Status Badge Variants */
.status-badge-success {
  --badge-color: var(--theme-success) !important;
  --badge-text: var(--theme-background) !important;
  background-image: linear-gradient(90deg, transparent 0, transparent calc(1ch - 1px), var(--theme-success) calc(1ch - 1px), var(--theme-success) calc(100% - 1ch + 1px), transparent calc(100% - 1ch + 1px), transparent) !important;
  color: var(--theme-background) !important;
}

.status-badge-warning {
  --badge-color: var(--theme-warning) !important;
  --badge-text: var(--theme-background) !important;
  background-image: linear-gradient(90deg, transparent 0, transparent calc(1ch - 1px), var(--theme-warning) calc(1ch - 1px), var(--theme-warning) calc(100% - 1ch + 1px), transparent calc(100% - 1ch + 1px), transparent) !important;
  color: var(--theme-background) !important;
}

.status-badge-error {
  --badge-color: var(--theme-error) !important;
  --badge-text: var(--theme-background) !important;
  background-image: linear-gradient(90deg, transparent 0, transparent calc(1ch - 1px), var(--theme-error) calc(1ch - 1px), var(--theme-error) calc(100% - 1ch + 1px), transparent calc(100% - 1ch + 1px), transparent) !important;
  color: var(--theme-background) !important;
}
```

### Phase 4: Accessibility & Polish (Priority: LOW)

#### 4.1 Color Contrast Validation

Ensure all theme color combinations meet WCAG AA standards:
- Check contrast ratios for all theme colors
- Add CSS fallbacks for low-contrast scenarios
- Test with browser accessibility tools

#### 4.2 Dark Mode Optimizations

Add specific dark mode enhancements:
```css
@media (prefers-color-scheme: dark) {
  /* Reduce brightness of success/warning colors in dark themes */
  :root {
    filter: brightness(0.95);
  }
  
  /* Increase contrast for text on dark backgrounds */
  .text-theme-foreground {
    text-shadow: 0 0 1px rgba(0, 0, 0, 0.1);
  }
}
```

#### 4.3 Reduced Motion Support

Add animations with reduced motion support:
```css
@media (prefers-reduced-motion: reduce) {
  .connection-indicator.connected {
    animation: none;
  }
  
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

---

## Implementation Checklist

### Phase 1: CSS Foundation ✅
- [ ] Add status color utilities to `globals.css`
- [ ] Add opacity-based background utilities
- [ ] Create semantic CSS classes (connection-indicator, status-card, etc.)
- [ ] Add border utilities with opacity support

### Phase 2: Component Refactoring ✅
- [ ] Update `ToolPart.tsx` - remove hard-coded colors
- [ ] Update `StepPart.tsx` - audit for hard-coded colors
- [ ] Update `ReasoningPart.tsx` - audit for hard-coded colors
- [ ] Update `FilePart.tsx` - audit for hard-coded colors
- [ ] Update `PatchPart.tsx` - audit for hard-coded colors
- [ ] Update `index.tsx` - replace connection status colors
- [ ] Update `index.tsx` - convert inline styles to utilities (batch 1: lines 1000-1200)
- [ ] Update `index.tsx` - convert inline styles to utilities (batch 2: lines 1200-1400)
- [ ] Update `index.tsx` - convert inline styles to utilities (batch 3: lines 1400-1600)
- [ ] Update `index.tsx` - convert inline styles to utilities (batch 4: lines 1600-1800)
- [ ] Update `index.tsx` - convert inline styles to utilities (batch 5: lines 1800-2000)
- [ ] Update `index.tsx` - convert inline styles to utilities (batch 6: lines 2000+)
- [ ] Convert appropriate divs to View components

### Phase 3: UI Enhancements ✅
- [ ] Extend Button component with status variants
- [ ] Add status variant CSS for buttons
- [ ] Create StatusBadge component
- [ ] Add StatusBadge CSS
- [ ] Export new components from UI index
- [ ] Update imports in consuming components

### Phase 4: Accessibility ✅
- [ ] Validate color contrast for all themes
- [ ] Add dark mode optimizations
- [ ] Add reduced motion support
- [ ] Test with screen readers
- [ ] Validate keyboard navigation

### Phase 5: Testing & Validation ✅
- [ ] Test theme switching with all 20 themes
- [ ] Verify no hard-coded colors remain
- [ ] Check mobile responsiveness
- [ ] Validate touch target sizes (min 44px)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Performance audit (Lighthouse)

---

## Migration Guide for Developers

### Quick Reference: Style Migration Patterns

| Old Pattern | New Pattern | Notes |
|-------------|-------------|-------|
| `style={{ backgroundColor: 'var(--theme-background)' }}` | `className="bg-theme-background"` | Use utility class |
| `style={{ color: 'var(--theme-foreground)' }}` | `className="text-theme-foreground"` | Use utility class |
| `className="bg-green-500"` | `className="bg-theme-success"` | Theme-aware |
| `className="text-red-500"` | `className="text-theme-error"` | Theme-aware |
| `<div>` with borders | `<View box="square">` | Use WebTUI |
| Hard-coded status colors | `<StatusBadge status="success">` | New component |

### WebTUI Component Usage

Always prefer WebTUI components:
- Use `<View>` for containers with borders
- Use `<Button is-="button">` for all buttons
- Use `<Badge>` for labels and tags
- Use `<Pre>` for code/monospace text
- Use `<Separator>` for dividers

### Theme Color Reference

Available theme variables:
- `--theme-background` - Main background
- `--theme-backgroundAlt` - Alternate background (sidebars, cards)
- `--theme-backgroundAccent` - Hover/active states
- `--theme-foreground` - Primary text
- `--theme-foregroundAlt` - Secondary text
- `--theme-border` - Border color
- `--theme-primary` - Primary accent color
- `--theme-primaryHover` - Primary hover state
- `--theme-success` - Success states
- `--theme-warning` - Warning states
- `--theme-error` - Error states
- `--theme-muted` - Muted/disabled text

---

## Performance Considerations

### Before Refactoring
- 70+ inline style attributes in index.tsx
- Repeated CSS-in-JS calculations on every render
- Bundle size: ~XXX KB (measure baseline)

### After Refactoring (Expected)
- Reduced inline styles by 90%
- Utility classes cached by browser
- Smaller bundle size (estimated 5-10% reduction)
- Better runtime performance (fewer style recalculations)

---

## Rollout Strategy

### Stage 1: Non-Breaking Changes (Week 1)
1. Add new utility classes to globals.css
2. Add new components (StatusBadge, etc.)
3. Create semantic CSS classes
4. **No existing code changes yet**

### Stage 2: Component Migration (Week 2)
1. Migrate message components (ToolPart, StepPart, etc.)
2. Test each component individually
3. Create visual regression tests

### Stage 3: Main App Migration (Week 3)
1. Migrate index.tsx in batches (200 lines at a time)
2. Test after each batch
3. Fix any layout issues

### Stage 4: Polish & Testing (Week 4)
1. Cross-browser testing
2. Accessibility audit
3. Performance benchmarking
4. Documentation updates

---

## Success Metrics

- ✅ **Zero hard-coded Tailwind colors** in final codebase
- ✅ **90% reduction in inline styles** in index.tsx
- ✅ **All 20 themes** render correctly without visual bugs
- ✅ **100% WebTUI component adoption** for bordered containers
- ✅ **WCAG AA compliance** for color contrast
- ✅ **Touch targets >= 44px** on mobile
- ✅ **Lighthouse score >= 95** for accessibility

---

## Risk Mitigation

### Risk: Visual Regressions
- **Mitigation**: Take screenshots before/after each change
- **Mitigation**: Use visual regression testing tools (Percy, Chromatic)
- **Mitigation**: Staged rollout with rollback plan

### Risk: Theme Compatibility
- **Mitigation**: Test all 20 themes after each major change
- **Mitigation**: Automated theme switching tests in CI/CD

### Risk: Performance Impact
- **Mitigation**: Benchmark before and after
- **Mitigation**: Use React DevTools Profiler to identify slowdowns
- **Mitigation**: Lazy load non-critical CSS if needed

---

## Future Enhancements

### Post-Refactoring Improvements
1. **Theme Builder UI** - Allow users to create custom themes
2. **High Contrast Mode** - Dedicated high-contrast theme variants
3. **CSS Variables Export** - Export theme as CSS file for use in other apps
4. **Component Playground** - Storybook-like UI for testing components with all themes
5. **Automatic Dark/Light Mode** - Detect system preference and adapt

---

## Conclusion

This refactoring will modernize the OpenCode Web codebase by:
1. Eliminating hard-coded colors that break theme switching
2. Reducing inline styles for better maintainability
3. Standardizing on WebTUI components for visual consistency
4. Improving accessibility and mobile experience
5. Setting foundation for future theme customization features

**Estimated Effort**: 3-4 weeks (1 developer)
**Impact**: High - Affects all UI components
**Risk**: Medium - Requires careful testing but changes are isolated to presentation layer
