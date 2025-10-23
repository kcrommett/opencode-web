# Web UI Components Documentation

This directory contains React components that wrap the WebTUI CSS library, providing a type-safe interface for building styled components in React applications.

## Overview

WebTUI is a CSS library that brings terminal-inspired aesthetics to web browsers. These React components provide a convenient way to use WebTUI styling with proper TypeScript support and React patterns.

## Installation & Setup

The WebTUI CSS library is already installed:
```json
"@webtui/css": "^0.1.5"
```

Import the CSS in your global styles:
```css
@import "@webtui/css/base.css";
@import "@webtui/css/components/button.css";
@import "@webtui/css/components/input.css";
/* ... import other components as needed */
```

## Component Usage

### Importing Components

```tsx
// Import individual components
import { Button, Badge, Input } from '@/app/_components/ui';

// Import all components
import * as UI from '@/app/_components/ui';
```

## Components Reference

### Badge

Displays small status indicators or labels.

```tsx
<Badge variant="background2" cap="round">New</Badge>
<Badge variant="foreground1" cap="square">Beta</Badge>
```

**Props:**
- `children`: React.ReactNode - Content to display
- `variant?`: 'background0' | 'background1' | 'background2' | 'background3' | 'foreground0' | 'foreground1' | 'foreground2'
- `cap?`: 'square' | 'round' | 'triangle' | 'ribbon' | 'slant-top' | 'slant-bottom'
- `className?`: string

### Button

Interactive button component with various styling options.

```tsx
<Button variant="foreground0" box="round">Click me</Button>
<Button variant="background2" size="large">Large Button</Button>
```

**Props:**
- `children`: React.ReactNode - Button content
- `variant?`: 'background0' | 'background1' | 'background2' | 'background3' | 'foreground0' | 'foreground1' | 'foreground2'
- `box?`: 'square' | 'round' | 'double'
- `size?`: 'small' | 'large'
- `className?`: string
- Plus all standard button HTML attributes

### Input

Text input component.

```tsx
<Input size="large" placeholder="Enter text" />
<Input type="email" className="custom-input" />
```

**Props:**
- `size?`: 'small' | 'large'
- `className?`: string
- Plus all standard input HTML attributes (except `size` which conflicts)

### Textarea

Multi-line text input component.

```tsx
<Textarea size="large" placeholder="Enter description" rows={4} />
```

**Props:**
- `size?`: 'small' | 'large'
- `className?`: string
- Plus all standard textarea HTML attributes

### Checkbox

Checkbox input wrapped in a label.

```tsx
<Checkbox checked={isChecked} onChange={handleChange}>
  Accept terms
</Checkbox>
```

**Props:**
- `children?`: React.ReactNode - Label text
- `className?`: string
- Plus all standard input HTML attributes

### Radio

Radio input wrapped in a label.

```tsx
<Radio name="choice" value="option1" checked={selected === 'option1'}>
  Option 1
</Radio>
```

**Props:**
- `children?`: React.ReactNode - Label text
- `className?`: string
- Plus all standard input HTML attributes

### Switch

Toggle switch component.

```tsx
<Switch checked={isToggled} onChange={handleToggle}>
  Enable feature
</Switch>
```

**Props:**
- `children?`: React.ReactNode - Label text
- `className?`: string
- Plus all standard input HTML attributes

### Pre

Preformatted text component.

```tsx
<Pre size="large">
{`function hello() {
  console.log("Hello World");
}`}
</Pre>
```

**Props:**
- `children`: React.ReactNode - Preformatted content
- `size?`: 'small' | 'large'
- `className?`: string

### Table Components

Complete table system with multiple sub-components.

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Age</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
      <TableCell>25</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Components:**
- `Table` - Main table wrapper
- `TableHeader` - Table header section
- `TableBody` - Table body section
- `TableRow` - Table row
- `TableHead` - Header cell
- `TableCell` - Data cell

All table components accept standard HTML attributes and `className`.

### Separator

Visual separator/divider component.

```tsx
<Separator />
<Separator direction="vertical" cap="bisect" />
```

**Props:**
- `direction?`: 'horizontal' | 'vertical' | 'x' | 'y' (default: 'horizontal')
- `cap?`: 'edge' | 'bisect' | 'default'
- `className?`: string

### Dialog

Modal dialog component.

```tsx
<Dialog size="full" container="fill" open>
  <p>Dialog content</p>
</Dialog>
```

**Props:**
- `children`: React.ReactNode - Dialog content
- `size?`: 'full'
- `container?`: 'fill'
- `className?`: string
- Plus all standard dialog HTML attributes

### Popover

Expandable content component.

```tsx
<Popover position="bottom right">
  <PopoverTrigger>
    <Button>Click me</Button>
  </PopoverTrigger>
  <PopoverContent>
    <p>Popover content</p>
  </PopoverContent>
</Popover>
```

**Components:**
- `Popover` - Main popover wrapper
  - `position?`: 'bottom right' | 'bottom left' | 'top right' | 'top left'
- `PopoverTrigger` - Clickable trigger element
- `PopoverContent` - Content to show when triggered

### Tooltip

Hover tooltip component.

```tsx
<Tooltip>
  <TooltipTrigger>
    <Button>Hover me</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Tooltip content</p>
  </TooltipContent>
</Tooltip>
```

**Components:**
- `Tooltip` - Main tooltip wrapper
- `TooltipTrigger` - Element that triggers the tooltip
- `TooltipContent` - Tooltip content

### Range

Range input slider.

```tsx
<Range min={0} max={100} value={50} onChange={handleChange} />
```

**Props:**
- `className?`: string
- Plus all standard input HTML attributes

### Progress

Progress bar component.

```tsx
<Progress max={100} value={75} />
```

**Props:**
- `className?`: string
- Plus all standard progress HTML attributes

### Spinner

Loading spinner component.

```tsx
<Spinner size="large" />
```

**Props:**
- `size?`: 'small' | 'large'
- `className?`: string

### View

General container component with box utilities.

```tsx
<View box="round" shear="top">
  <p>Content with rounded corners</p>
</View>
```

**Props:**
- `children`: React.ReactNode - Container content
- `box?`: 'square' | 'round' | 'double'
- `shear?`: 'top' | 'bottom' | 'both'
- `className?`: string

## Best Practices

1. **Import CSS**: Always import the required WebTUI CSS files in your global styles
2. **TypeScript**: All components are fully typed - use TypeScript for better development experience
3. **Accessibility**: Components like Checkbox and Radio include proper label wrapping
4. **Customization**: Use `className` prop for additional styling
5. **Composition**: Use sub-components (like TableHeader, TableBody) for complex structures

## WebTUI CSS Features Used

- `is-` attributes for component identification
- `variant-` attributes for color variations
- `box-` attributes for border styles
- `size-` attributes for sizing
- `cap-` attributes for separator styling
- `direction-` attributes for orientation
- `position-` attributes for positioning
- `shear-` attributes for content overflow

## Examples

### Complete Form Example

```tsx
import { Button, Input, Textarea, Checkbox, Radio, Switch, Badge } from '@/app/_components/ui';

function ContactForm() {
  return (
    <View box="round" className="p-4">
      <h2>Contact Form</h2>

      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Full Name"
          size="large"
        />

        <Input
          type="email"
          placeholder="Email Address"
        />

        <Textarea
          placeholder="Message"
          rows={4}
          size="large"
        />

        <div className="space-y-2">
          <Radio name="priority" value="low">Low Priority</Radio>
          <Radio name="priority" value="high">High Priority</Radio>
        </div>

        <Switch>Subscribe to newsletter</Switch>

        <Checkbox>Accept terms and conditions</Checkbox>

        <div className="flex gap-2">
          <Button variant="foreground0" box="round">
            Submit
          </Button>
          <Button variant="background2" box="square">
            Cancel
          </Button>
        </div>
      </div>
    </View>
  );
}
```

### Dashboard Example

```tsx
import { Badge, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Separator, Progress } from '@/app/_components/ui';

function Dashboard() {
  return (
    <View box="square" className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1>Dashboard</h1>
        <Badge variant="background2" cap="round">Live</Badge>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 my-4">
        <View box="round" className="p-3">
          <h3>Progress</h3>
          <Progress max={100} value={75} />
        </View>

        <View box="round" className="p-3">
          <h3>Status</h3>
          <Badge variant="foreground1">Active</Badge>
        </View>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Project Alpha</TableCell>
            <TableCell><Badge variant="background2">In Progress</Badge></TableCell>
            <TableCell>
              <Button size="small">Edit</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </View>
  );
}
```

## Notes

- All components extend their respective HTML element interfaces
- WebTUI CSS-specific props use kebab-case (e.g., `variant-`, `box-`)
- Components are designed to be composable and flexible
- TypeScript provides full type safety and IntelliSense support
- Components follow React best practices and patterns