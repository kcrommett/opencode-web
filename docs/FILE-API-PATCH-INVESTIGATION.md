# File API Patch Type Investigation

## Summary

The OpenCode server's `/file/content` endpoint (formerly `/file?path=<path>`) returns file content with **automatic git diff/patch information** when the file has uncommitted changes.

## API Endpoint

```
GET /file/content?path=<path>
```

**Response Type:**
```typescript
{
  type: "text",
  content: string,
  diff?: string,           // Unified diff format
  patch?: {                // Structured patch data
    oldFileName: string,
    newFileName: string,
    oldHeader?: string,
    newHeader?: string,
    hunks: Array<{
      oldStart: number,
      oldLines: number,
      newStart: number,
      newLines: number,
      lines: string[]
    }>,
    index?: string
  },
  encoding?: "base64",
  mimeType?: string
}
```

## How It Works

Based on `packages/opencode/src/file/index.ts`:

1. **File Reading:** When `File.read(path)` is called:
   - Reads the file content from disk
   - If the project is a git repository, checks for uncommitted changes

2. **Git Diff Detection:**
   ```typescript
   if (project.vcs === "git") {
     // Check unstaged changes
     let diff = await $`git diff ${file}`.cwd(Instance.directory).quiet().nothrow().text()
     
     // If no unstaged changes, check staged changes
     if (!diff.trim()) {
       diff = await $`git diff --staged ${file}`.cwd(Instance.directory).quiet().nothrow().text()
     }
   }
   ```

3. **Patch Generation (when changes exist):**
   ```typescript
   if (diff.trim()) {
     // Get original content from HEAD
     const original = await $`git show HEAD:${file}`.cwd(Instance.directory).quiet().nothrow().text()
     
     // Create structured patch
     const patch = structuredPatch(file, file, original, content, "old", "new", {
       context: Infinity,
       ignoreWhitespace: true,
     })
     
     // Format as unified diff
     const diff = formatPatch(patch)
     
     return { type: "text", content, patch, diff }
   }
   ```

## Key Findings

### 1. No "patch" Type Parameter
The documentation showing `{ type: "raw" | "patch", content: string }` is **outdated**. The actual implementation:
- Always returns `type: "text"`
- Automatically includes `patch` and `diff` fields when git changes are detected
- No need to specify a type parameter

### 2. Automatic Diff Detection
- The server automatically detects git changes
- Returns both:
  - `diff`: Unified diff string (ready to display)
  - `patch`: Structured data (for programmatic use)
- Works for both staged and unstaged changes

### 3. Branch Comparison: dev vs opentui
**Result:** Both branches are **identical** for the file API implementation.
- `packages/opencode/src/file/index.ts` is the same in both branches
- No differences in file endpoints or capabilities

## Current Implementation in opencode-web

Our `readFile` function in `opencode-client.ts` already handles this correctly:

```typescript
export async function readFile(path: string): Promise<FileContentData | null> {
  const response = await fetch(
    `${baseUrl}/file/content?path=${encodeURIComponent(path)}`
  );
  const data = await response.json();
  return {
    text: data.content,
    mimeType: data.mimeType,
    encoding: data.encoding,
    dataUrl: data.encoding === "base64" 
      ? `data:${data.mimeType};base64,${data.content}` 
      : null,
    diff: data.diff,        // ✅ Already capturing diff
    patch: data.patch,      // ✅ Already capturing patch
  };
}
```

## Usage Recommendations

### For Modified Files Panel
When clicking a modified file:
1. Call `readFile(filePath)` (existing function)
2. The response will automatically include:
   - `diff`: String showing the changes (if any)
   - `patch`: Structured diff data (if any)
3. Display the diff in the file viewer

### Example Usage
```typescript
const fileData = await readFile("src/app/index.tsx");

if (fileData.diff) {
  // File has uncommitted changes
  // Display diff using diff2html or similar
  console.log("Diff:", fileData.diff);
}

if (fileData.patch) {
  // Use structured patch data for advanced features
  console.log("Hunks:", fileData.patch.hunks);
}
```

## Related Files

- **Server Implementation:** `packages/opencode/src/file/index.ts` (sst/opencode repo)
- **Server Endpoint:** `packages/opencode/src/server/server.ts` line 1161
- **SDK Types:** `packages/sdk/js/src/gen/types.gen.ts`
- **Our Implementation:** `src/lib/opencode-client.ts`
- **Type Definitions:** `src/types/opencode.ts`

## Next Steps

We can enhance the file viewer to:
1. ✅ Already captures diff/patch data when files have changes
2. Display diff visualization when viewing modified files
3. Add a toggle to switch between "current content" and "diff view"
4. Use the structured `patch` data for inline diff rendering

## References

- OpenCode Server Docs: `/packages/web/src/content/docs/server.mdx`
- Git Diff Library: [diff package](https://www.npmjs.com/package/diff) used by OpenCode
- Diff Display: We already use [diff2html](https://www.npmjs.com/package/diff2html) in our codebase
