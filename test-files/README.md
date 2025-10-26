# Lisp and Clojure Test Files

This directory contains sample files to test and demonstrate support for Lisp family languages in OpenCode Web.

## Files Overview

### Common Lisp Files (`.cl`, `.lisp`)

1. **factorial.cl** - Classic factorial implementation
   - Demonstrates recursive and iterative approaches
   - Shows Common Lisp syntax and loop constructs
   - Good for basic syntax highlighting test

2. **quicksort.lisp** - Quicksort algorithm implementation
   - Classic divide-and-conquer sorting
   - Shows higher-order functions and lambda expressions
   - Demonstrates list manipulation

3. **macros.lisp** - Advanced macro examples
   - Shows the power of Lisp's macro system
   - Includes: `unless`, `while`, `time-it`, memoization, threading macros
   - Demonstrates metaprogramming capabilities

### Clojure Files (`.clj`)

1. **web-server.clj** - Ring/Compojure web server
   - RESTful API with in-memory database (atom)
   - Todo list CRUD operations
   - Shows Clojure web development patterns

2. **data-transform.clj** - Functional data transformations
   - Working with collections (map, filter, reduce)
   - Threading macros (`->>`, `->`)
   - Higher-order functions and composition

### ClojureScript Files (`.cljs`)

1. **react-component.cljs** - Reagent React components
   - Counter and Todo list components
   - Reactive state management with atoms
   - Shows ClojureScript + React integration

### Clojure Common Files (`.cljc`)

1. **platform-utils.cljc** - Cross-platform utilities
   - Reader conditionals for JVM and JavaScript
   - Platform-specific implementations
   - Shows code that runs on both Clojure and ClojureScript

### EDN Files (`.edn`)

1. **config.edn** - Application configuration
   - Extensible Data Notation (Clojure's data format)
   - Rich configuration with nested maps
   - Shows EDN syntax and data types

## Testing These Files

All files have been tested with the OpenCode Web implementation:

- ✅ **MIME Type Detection**: All files correctly identified as text
- ✅ **Syntax Highlighting**: Proper highlighting for each language
- ✅ **File Icons**: Correct icons displayed for each extension
- ✅ **Language Detection**: Accurate language identification

### File Extension Mapping

| Extension | MIME Type | Language | Icon |
|-----------|-----------|----------|------|
| `.cl` | text/x-common-lisp | lisp | Lisp |
| `.lisp` | text/x-common-lisp | lisp | Lisp |
| `.clj` | text/x-clojure | clojure | Clojure |
| `.cljs` | text/x-clojure | clojure | Clojure |
| `.cljc` | text/x-clojure | clojure | Clojure |
| `.edn` | application/edn | clojure | Clojure |

## Related Implementation

These test files validate the implementation from **Issue #39**:
- Package: `mime-types` for MIME type detection
- Module: `src/lib/mime-utils.ts` for custom mappings
- Hook: `src/hooks/useOpenCode.ts` for file detection
- Highlighting: `src/lib/highlight.ts` for syntax support
- Icons: `src/app/_components/files/file-icon.tsx` for visual identification

## Usage

You can use these files to:
1. Test file opening and inspection in OpenCode Web
2. Verify syntax highlighting for Lisp family languages
3. Check file icon display
4. Demonstrate code examples for documentation
5. Serve as templates for new Lisp/Clojure projects

## Notes

- All files contain working, runnable code (though some require dependencies)
- Code follows idiomatic patterns for each language
- Comments explain key concepts and patterns
- Files demonstrate both basic and advanced language features
