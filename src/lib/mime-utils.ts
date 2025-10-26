/**
 * MIME Type Utilities for File Detection
 *
 * This module provides utilities for detecting MIME types and determining
 * whether files should be decoded as text or binary. It uses the `mime-types`
 * package as a foundation but extends it with custom mappings for programming
 * languages and special file types not covered by the IANA registry.
 *
 * @see https://github.com/kcrommett/opencode-web/issues/39
 */

import * as mime from "mime-types";

/**
 * Custom MIME type mappings for file extensions not covered by mime-types package.
 * This includes programming languages, configuration files, and other text formats.
 */
const CUSTOM_MIME_TYPES: Record<string, string> = {
  // Lisp family languages
  cl: "text/x-common-lisp",
  lisp: "text/x-common-lisp",
  el: "text/x-emacs-lisp",
  clj: "text/x-clojure",
  cljs: "text/x-clojure",
  cljc: "text/x-clojure",
  edn: "application/edn",
  scm: "text/x-scheme",

  // Python (mime-types doesn't recognize .py)
  py: "text/x-python",
  pyw: "text/x-python",
  pyi: "text/x-python",

  // TypeScript (mime-types returns video/mp2t for .ts)
  ts: "text/typescript",
  tsx: "text/typescript",
  mts: "text/typescript",
  cts: "text/typescript",

  // Rust (mime-types doesn't recognize .rs)
  rs: "text/x-rust",

  // Go
  go: "text/x-go",

  // Ruby
  rb: "text/x-ruby",
  rake: "text/x-ruby",

  // Shell scripts
  sh: "text/x-shellscript",
  bash: "text/x-shellscript",
  zsh: "text/x-shellscript",

  // Config and data formats
  yaml: "application/x-yaml",
  yml: "application/x-yaml",
  toml: "application/toml",
  ini: "text/plain",
  conf: "text/plain",
  cfg: "text/plain",
  env: "text/plain",

  // Markdown
  md: "text/markdown",
  markdown: "text/markdown",

  // Lock files
  lock: "text/plain",

  // Git files
  gitignore: "text/plain",
  gitattributes: "text/plain",
};

/**
 * Special filenames without extensions that should be treated as text.
 * Maps lowercase filename to MIME type.
 */
const SPECIAL_FILENAMES: Record<string, string> = {
  makefile: "text/x-makefile",
  dockerfile: "text/x-dockerfile",
  ".gitignore": "text/plain",
  ".gitattributes": "text/plain",
  ".editorconfig": "text/plain",
  ".env": "text/plain",
  ".env.local": "text/plain",
  ".env.development": "text/plain",
  ".env.production": "text/plain",
  ".env.example": "text/plain",
  readme: "text/plain",
  "readme.md": "text/markdown",
  "readme.txt": "text/plain",
  license: "text/plain",
  "license.md": "text/markdown",
  "license.txt": "text/plain",
  changelog: "text/plain",
  "changelog.md": "text/markdown",
  contributing: "text/plain",
  "contributing.md": "text/markdown",
  "cargo.toml": "application/toml",
  "package.json": "application/json",
  "package-lock.json": "application/json",
  "pnpm-lock.yaml": "application/x-yaml",
  "bun.lock": "text/plain",
};

/**
 * MIME types that represent text-based formats, even if they don't start with "text/".
 */
const TEXT_LIKE_APPLICATION_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/xhtml+xml",
  "application/yaml",
  "application/x-yaml",
  "application/toml",
  "application/javascript",
  "application/typescript",
  "application/sql",
  "application/edn",
]);

/**
 * Get the MIME type for a file path.
 *
 * This function uses the following detection strategy:
 * 1. Check for special filenames (e.g., Makefile, Dockerfile)
 * 2. Check custom MIME type mappings for programming languages
 * 3. Fall back to mime-types package for standard types
 *
 * @param filePath - The file path or name
 * @returns The MIME type string, or false if it cannot be determined
 *
 * @example
 * getMimeType('script.py') // → 'text/x-python'
 * getMimeType('Makefile') // → 'text/x-makefile'
 * getMimeType('data.json') // → 'application/json'
 */
export function getMimeType(filePath: string): string | false {
  const baseName = filePath.split(/[\\/]/).pop() ?? "";
  const normalizedBaseName = baseName.toLowerCase();

  // Check special filenames first (files without extensions)
  if (SPECIAL_FILENAMES[normalizedBaseName]) {
    return SPECIAL_FILENAMES[normalizedBaseName];
  }

  // Extract extension
  const extension = normalizedBaseName.includes(".")
    ? (normalizedBaseName.split(".").pop() ?? "")
    : "";

  // Check custom mappings
  if (extension && CUSTOM_MIME_TYPES[extension]) {
    return CUSTOM_MIME_TYPES[extension];
  }

  // Fall back to mime-types package
  return mime.lookup(filePath);
}

/**
 * Check if a MIME type represents a text-based format.
 *
 * A MIME type is considered text-based if it:
 * - Starts with "text/"
 * - Contains a charset parameter
 * - Is a known text-like application type (JSON, XML, YAML, etc.)
 *
 * @param mimeType - The MIME type string
 * @returns true if the MIME type represents text, false otherwise
 *
 * @example
 * isTextMimeType('text/plain') // → true
 * isTextMimeType('application/json') // → true
 * isTextMimeType('image/png') // → false
 */
export function isTextMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();

  // Check for text/* MIME types
  if (normalized.startsWith("text/")) return true;

  // Check for charset parameter (indicates text encoding)
  if (normalized.includes("charset=")) return true;

  // Check for known text-like application types
  if (TEXT_LIKE_APPLICATION_TYPES.has(normalized.split(";")[0].trim())) {
    return true;
  }

  return false;
}

/**
 * Determine if a file should be decoded as text based on MIME type and path.
 *
 * This function implements the core logic for text vs binary file detection:
 * 1. If no MIME type is provided, detect it from the file path
 * 2. Check if the MIME type represents a text format
 * 3. Handle special case: application/octet-stream may be text if extension indicates so
 * 4. Fall back to extension-based detection
 *
 * This function maintains backward compatibility with the original hard-coded
 * logic while leveraging the mime-types package for better coverage.
 *
 * @param mimeType - The MIME type from server (may be null or incorrect)
 * @param filePath - The file path or name
 * @returns true if file should be decoded as text, false for binary
 *
 * @example
 * shouldDecodeAsText('text/plain', 'notes.txt') // → true
 * shouldDecodeAsText('application/octet-stream', 'script.py') // → true
 * shouldDecodeAsText('image/png', 'photo.png') // → false
 * shouldDecodeAsText(null, 'Dockerfile') // → true
 */
export function shouldDecodeAsText(
  mimeType: string | null,
  filePath: string,
): boolean {
  // Try to detect MIME type from file path if not provided
  const detectedMimeType = getMimeType(filePath);
  const effectiveMimeType = mimeType || detectedMimeType;

  // If we still don't have a MIME type, return false (treat as binary)
  if (!effectiveMimeType) {
    return false;
  }

  // Check if MIME type indicates text
  if (isTextMimeType(effectiveMimeType)) {
    return true;
  }

  // Special case: application/octet-stream is a generic binary type
  // but the file might actually be text based on its extension
  if (effectiveMimeType.toLowerCase() === "application/octet-stream") {
    const redetectedType = getMimeType(filePath);
    if (redetectedType && isTextMimeType(redetectedType)) {
      return true;
    }
  }

  return false;
}
