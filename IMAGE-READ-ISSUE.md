# Image File Reading Issue

## Problem Summary

The OpenCode HTTP server's `/file/content` endpoint corrupts binary image data when returning it as JSON, making it impossible to display images in the web interface.

## Root Cause

The OpenCode server reads binary files and includes them in JSON responses without proper base64 encoding. This causes binary data corruption because:

1. Binary data contains bytes that are not valid UTF-8 sequences
2. When the server converts binary data to a JSON string, invalid UTF-8 bytes are replaced with the UTF-8 replacement character (U+FFFD, which encodes as `ef bf bd` in hex)
3. For example, PNG files start with the signature `89 50 4e 47 0d 0a 1a 0a`, but the server returns `ef bf bd 50 4e 47 5c 72 5c 6e...` where:
   - `89` (invalid UTF-8) → `ef bf bd` (replacement character �)
   - The rest gets JSON-escaped (`0d 0a` → `\r\n`)

## Evidence

```bash
# Expected PNG signature
$ hexdump -C screenshot.png | head -1
00000000  89 50 4e 47 0d 0a 1a 0a  00 00 00 0d 49 48 44 52

# What the OpenCode server returns
$ curl -s "http://localhost:4096/file/content?path=screenshot.png&directory=/path" | od -An -tx1 -N50
 7b 22 63 6f 6e 74 65 6e 74 22 3a 22 ef bf bd 50
 4e 47 5c 72 5c 6e 5c 75 30 30 31 61 5c 6e 5c 75
 30 30 30 30 5c 75 30 30 30 30 5c 75 30 30 30 30
 5c 72
```

The response shows:
- `ef bf bd` instead of `89` (first byte corrupted)
- JSON-escaped sequences like `\r\n` instead of raw bytes

## API Documentation

According to the OpenCode server's OpenAPI spec at `/doc`:

```json
{
  "paths": {
    "/file/content": {
      "get": {
        "description": "Read a file",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FileContent"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "FileContent": {
        "type": "object",
        "properties": {
          "content": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

The API returns `content` as a plain `string`, with no indication of encoding or special handling for binary files.

## Attempted Solutions

### 1. Parse as ArrayBuffer (Failed)
**Approach**: Read the response as `arrayBuffer()` to get raw bytes before JSON parsing.

**Result**: Failed - by the time we fetch the response, the server has already corrupted the data by converting binary to a UTF-8 string.

### 2. Latin1 Decoding (Failed)
**Approach**: Use `TextDecoder('latin1')` to preserve byte values 0-255.

**Code**:
```typescript
const arrayBuffer = await response.arrayBuffer()
const decoder = new TextDecoder('latin1')
const text = decoder.decode(arrayBuffer)
```

**Result**: Failed - the corruption happens on the server side before the response is sent, not during client-side decoding.

### 3. Manual JSON Unescaping (Failed)
**Approach**: Manually extract and unescape the content field from the JSON string.

**Code**:
```typescript
const unescaped = escapedContent
  .replace(/\\u0000/g, '\u0000')
  .replace(/\\u([0-9a-f]{4})/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
  .replace(/\\r/g, '\r')
  .replace(/\\n/g, '\n')
  // ...etc
```

**Result**: Failed - while this correctly unescapes JSON sequences like `\r\n`, it cannot recover bytes that were already corrupted (e.g., `ef bf bd` cannot be converted back to `89`).

### 4. Direct Filesystem Access (Current Workaround ✓)
**Approach**: When running on the Node.js server, bypass the OpenCode API entirely and read image files directly from the filesystem.

**Code**:
```typescript
export async function readFile(filePath: string, directory?: string) {
  const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|ico)$/i.test(filePath)
  
  // Server-side direct filesystem access for images
  if (isImage && directory && typeof window === 'undefined') {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const fullPath = path.join(directory, filePath)
      const buffer = await fs.readFile(fullPath)
      const base64 = buffer.toString('base64')
      return { type: 'raw', content: base64 }
    } catch (error) {
      console.error('Failed to read image file directly from filesystem:', error)
    }
  }
  
  // Fallback to OpenCode API for text files
  const response = await fetch(url)
  const data = await response.json()
  return data
}
```

**Location**: `src/lib/opencode-http-api.ts:224-246`

**Result**: ✓ Works - successfully reads and displays images by avoiding the broken OpenCode API.

**Limitations**:
- Only works when the web server and OpenCode server run on the same machine with access to the same filesystem
- Will not work in deployments where the web UI is hosted separately from the project files
- Falls back to broken API behavior if filesystem read fails

## Proper Solution (TODO)

The OpenCode server needs to be fixed to properly handle binary files. Options:

### Option 1: Base64 Encode Binary Files
Modify the OpenCode server to detect binary files and base64-encode them before including in JSON:

```typescript
// Server-side (OpenCode)
const content = isBinaryFile(filePath) 
  ? Buffer.from(fileData).toString('base64')
  : fileData.toString('utf8')

return {
  content,
  encoding: isBinaryFile(filePath) ? 'base64' : 'utf8'
}
```

### Option 2: Return Binary Data Directly
For binary files, return the raw bytes with proper Content-Type instead of JSON:

```typescript
// Server-side (OpenCode)
if (isBinaryFile(filePath)) {
  response.setHeader('Content-Type', getMimeType(filePath))
  return fileData
}
```

### Option 3: Separate Endpoint for Binary Files
Create a dedicated endpoint like `/file/binary` that returns raw binary data:

```
GET /file/binary?path=<path>&directory=<directory>
Response: raw binary data with appropriate Content-Type
```

## Affected Files

- `src/lib/opencode-http-api.ts` - Contains the workaround
- `src/app/index.tsx` - Image display logic
- OpenCode server `/file/content` endpoint - Root cause

## Related Issues

This issue affects all binary file types, not just images:
- Images: `.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.ico`, `.svg`
- Other binary files: PDFs, executables, archives, etc.

Currently only images are worked around. Other binary files will still be corrupted if accessed through the OpenCode API.

## Testing

To verify the issue:

```bash
# 1. Check a PNG file signature
hexdump -C screenshot.png | head -1
# Expected: 89 50 4e 47 0d 0a 1a 0a

# 2. Check what OpenCode server returns
curl -s "http://localhost:4096/file/content?path=screenshot.png&directory=/path/to/project" | od -An -tx1 -N50
# Current: ef bf bd 50 4e 47 (first byte corrupted)

# 3. Test the workaround
# Open web UI, navigate to Files tab, click on an image
# Should display correctly using filesystem workaround
```

## References

- OpenCode HTTP API docs: `http://localhost:4096/doc`
- PNG file format spec: https://www.w3.org/TR/PNG/#5PNG-file-signature
- UTF-8 replacement character: https://en.wikipedia.org/wiki/Specials_(Unicode_block)#Replacement_character
