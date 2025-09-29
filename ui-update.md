# UI Improvement Plan for Modern TUI Look

## Current State Analysis

**Issues Identified:**
1. **Missing borders** - The main sections (sidebar, main content area) have no visible borders separating them
2. **No dividers** - Header sections lack horizontal separators 
3. **Flat appearance** - The UI lacks the structured, compartmentalized look of traditional TUIs
4. **Inconsistent use of WebTUI components** - Not leveraging `Separator`, `View` with borders, and box utilities
5. **No section framing** - Content areas lack border boxes typical of terminal applications

---

## Detailed Improvement Plan

### **Phase 1: Add Structural Borders and Dividers**

**1.1 Top Header Section (Lines 503-554)**
- [x] Add `Separator` component after the top bar to separate status from navigation
- [x] Add border to the header container using WebTUI `View` with `box="square"` or `box="round"`
- [x] Add vertical separators between "Help" and "Themes" buttons

**1.2 Sidebar Container (Lines 559-812)**
- [x] Wrap entire sidebar in `View` with `box="square"` attribute for border
- [x] Add `Separator` between Projects and Sessions sections (around line 593)
- [x] Add `Separator` after section headers
- [x] Add border to individual project/session cards using `View` component instead of plain `div`

**1.3 Main Content Area (Lines 815-1001)**
- [x] Add `View` with `box="square"` wrapper around entire main content
- [x] Add `Separator` after header section (line 823)
- [x] Add border to message bubbles using `View` with `box="round"` (already partially done)
- [x] Add `Separator` above input area (line 913)

**1.4 File Browser (Lines 700-808)**
- [x] Add `Separator` after search section
- [x] Add `Separator` after breadcrumb navigation
- [x] Add borders to file list items using `View` component

---

### **Phase 2: Enhance Visual Hierarchy**

**2.1 Section Headers**
- [ ] Wrap section headers (Projects, Sessions, Files) in `View` with `box="square"` for emphasis
- [ ] Add background variant to headers: `variant="background2"`
- [ ] Add consistent padding and margin

**2.2 Content Containers**
- [ ] Replace plain `div` backgrounds with `View` components using `box` attribute
- [ ] Use `box="double"` for primary sections (main chat area)
- [ ] Use `box="square"` for secondary sections (sidebar panels)
- [ ] Use `box="round"` for individual items (messages, cards)

**2.3 Borders Between Columns**
- [x] Add vertical `Separator` between sidebar and main content (using `direction="vertical"`)
- [x] Ensure the separator spans full height of the container

---

### **Phase 3: Implement WebTUI Patterns**

**3.1 Use Separator Component Extensively**
```tsx
<Separator /> // Horizontal dividers after headers
<Separator direction="vertical" /> // Between columns
<Separator cap="bisect" /> // For emphasized breaks
```

**3.2 Apply Box Utilities Consistently**
```tsx
<View box="square" className="...">...</View> // Containers
<View box="round" className="...">...</View> // Items
<View box="double" className="...">...</View> // Emphasized sections
```

**3.3 Add Proper Data Attributes**
- [x] Ensure all WebTUI components use proper `is-=""` and `data-*` attributes
- [x] Check that CSS is properly targeting these attributes

---

### **Phase 4: Specific Component Updates**

**4.1 Projects List (Lines 564-592)**
```tsx
<View box="square" className="flex-shrink-0 p-3">
  <h3>Projects</h3>
  <Separator className="my-2" />
  <div className="overflow-y-auto space-y-2">
    {projects.map(project => (
      <View box="round" key={project.id} className="...">
        {/* project content */}
      </View>
    ))}
  </div>
</View>
```

**4.2 Chat Messages Area (Lines 828-911)**
```tsx
<View box="double" className="flex-1 flex flex-col">
  <Separator />
  <div className="flex-1 overflow-y-auto p-4">
    {/* messages */}
  </div>
  <Separator />
  <div className="input-area p-4">
    {/* input */}
  </div>
</View>
```

**4.3 Input Area (Lines 913-964)**
- [ ] Add top border using `Separator`
- [ ] Wrap in `View` with `box="square"`
- [ ] Add borders to textarea

**4.4 Dialogs (Lines 1004-1126)**
- [ ] Ensure all dialogs use `View` with `box="square"` or `box="round"`
- [ ] Add `Separator` after dialog headers

---

### **Phase 5: Layout Structure Improvements**

**5.1 Main Container**
- [ ] Add border around entire app using `View` with `box="square"`
- [ ] Ensure proper spacing between bordered sections

**5.2 Grid Lines and Gutters**
- [ ] Add consistent padding: `p-4` for major sections, `p-2` for minor sections
- [ ] Add gap between sections using Tailwind's `gap-*` utilities
- [ ] Consider adding vertical separator at exact split between sidebar and content

**5.3 Responsive Borders**
- [ ] Ensure borders remain visible at all screen sizes
- [ ] Consider using `border-collapse` equivalent for TUI borders

---

### **Phase 6: CSS Enhancements**

**6.1 Global CSS Updates (globals.css)**
```css
/* Add custom TUI border styles */
[is-="view"][data-box="square"],
[is-="view"][data-box="round"],
[is-="view"][data-box="double"] {
  border-width: 1px;
  border-style: solid;
}

/* Ensure separators are visible */
[is-="separator"] {
  opacity: 1;
  visibility: visible;
}

/* Add depth to bordered containers */
[is-="view"] {
  position: relative;
}
```

**6.2 Theme-Specific Border Colors**
- [x] Ensure borders use proper theme colors from Catppuccin
- [x] Add contrast between borders and backgrounds
- [x] Consider using `border-[#45475a]` or similar from theme

---

### **Phase 7: Component-Level Changes**

**7.1 Update page.tsx Structure**
```tsx
<View box="square" className="h-screen flex flex-col">
  {/* Top Bar with separator */}
  <View box="square" className="bg-[#313244] p-4">
    {/* header content */}
  </View>
  <Separator />
  
  {/* Main content with vertical separator */}
  <div className="flex-1 flex overflow-hidden">
    <View box="square" className="w-80 bg-[#313244]">
      {/* sidebar */}
    </View>
    <Separator direction="vertical" />
    <View box="square" className="flex-1">
      {/* main content */}
    </View>
  </div>
</View>
```

**7.2 Add Missing Separators**
- [x] After every header section
- [x] Between major content sections
- [x] Before and after scrollable areas

---

### **Phase 8: Testing and Refinement**

**8.1 Visual Testing**
- [x] Test all border/separator combinations
- [x] Ensure borders are visible in dark mode
- [x] Check for border overlap/collision issues

**8.2 Responsive Testing**
- [x] Test on various screen sizes
- [x] Ensure borders don't break layout on mobile
- [x] Verify separator visibility at all breakpoints

**8.3 Accessibility**
- [x] Ensure borders provide sufficient visual separation
- [x] Test with screen readers
- [x] Verify keyboard navigation with visible borders

---

## Priority Levels

**High Priority (Immediate Impact):**
1. Add vertical separator between sidebar and main content
2. Add horizontal separators after all headers
3. Wrap main sections in `View` with borders

**Medium Priority:**
4. Replace plain divs with bordered `View` components
5. Add separators between list items where appropriate
6. Enhance dialog borders

**Low Priority:**
7. Fine-tune border styles and spacing
8. Add advanced TUI decorations
9. Implement theme-specific border customization

---

## Expected Outcome

After implementation, the UI will have:
- Clear visual separation between all major sections (sidebar, main content, header)
- Horizontal dividers after every header and before/after major sections
- Vertical divider between sidebar and main content area
- Bordered containers for Projects, Sessions, Files sections
- Bordered cards for individual items (projects, sessions, messages)
- A structured, compartmentalized look matching traditional TUI applications
- Better visual hierarchy and information architecture
- More authentic terminal UI aesthetic