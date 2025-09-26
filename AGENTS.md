# Agent Guidelines for opencode-web

## Build/Lint/Test Commands

- **Development server**: `pnpm dev` (uses Turbopack)
- **Build**: `pnpm build` (uses Turbopack)
- **Start production**: `pnpm start`
- **Lint**: `pnpm lint` (ESLint with Next.js config)
- **No test framework configured** - add tests using your preferred framework

## Code Style Guidelines

### Project Structure
- Use Next.js 15 app router (`src/app/`)
- Components in `src/app/_components/ui/`
- Follow existing file naming: kebab-case for directories, camelCase for files

### TypeScript & React
- Strict TypeScript enabled - use explicit types
- React 19 with functional components
- Use `React.FC` for component typing
- Interface definitions for props extending React attributes
- Default props with `= ''` or similar

### Imports
- Next.js imports first (e.g., `import Image from "next/image"`)
- External libraries second
- Relative imports last
- Use path mapping: `@/*` for `src/*`

### Styling
- Tailwind CSS for utility classes
- @webtui/css for component styles
- CSS imports in component files when needed
- Dark mode support with `dark:` prefixes

### Naming Conventions
- Components: PascalCase (e.g., `Button`, `UserProfile`)
- Functions: camelCase
- Variables: camelCase
- Interfaces: PascalCase with `Props` suffix
- CSS classes: kebab-case in Tailwind

### Error Handling
- Use TypeScript strict mode for compile-time safety
- ESLint catches common issues
- No specific error handling patterns observed

### Code Quality
- ESLint with Next.js rules enabled
- No Prettier config - follow existing formatting
- Keep components focused and single-responsibility