#!/usr/bin/env bun

/**
 * Theme Synchronization Script
 * 
 * Converts OpenCode TUI theme JSON files to web client TypeScript format.
 * Resolves `defs` references and maps semantic keys to the web Theme interface.
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

interface TUIThemeDef {
  $schema: string;
  defs: Record<string, string>;
  theme: Record<string, string | { dark: string; light?: string }>;
}

interface WebTheme {
  name: string;
  id: string;
  colors: {
    background: string;
    backgroundAlt: string;
    backgroundAccent: string;
    foreground: string;
    foregroundAlt: string;
    border: string;
    primary: string;
    primaryHover: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
    backgroundPanel: string;
    backgroundElement: string;
    borderActive: string;
    borderSubtle: string;
    textMuted: string;
    secondary: string;
    accent: string;
    info: string;
    diffAdded: string;
    diffRemoved: string;
    diffContext: string;
    diffAddedBg: string;
    diffRemovedBg: string;
    diffContextBg: string;
    markdownHeading: string;
    markdownLink: string;
    markdownCode: string;
    markdownBlockQuote: string;
    syntaxComment: string;
    syntaxKeyword: string;
    syntaxString: string;
    syntaxFunction: string;
    diffHunkHeader: string;
    diffHighlightAdded: string;
    diffHighlightRemoved: string;
    diffLineNumber: string;
    diffAddedLineNumberBg: string;
    diffRemovedLineNumberBg: string;
  };
}

/**
 * Resolve a color reference from the defs map
 */
function resolveColor(
  ref: string,
  defs: Record<string, string>,
  theme?: Record<string, string | { dark: string; light?: string }>,
  visited: Set<string> = new Set()
): string {
  // Detect circular references
  if (visited.has(ref)) {
    throw new Error(`Circular reference detected: ${ref}`);
  }
  visited.add(ref);
  
  // If it's already a hex color, return it
  if (ref.startsWith("#")) return ref;
  
  // First try defs
  const defsResolved = defs[ref];
  if (defsResolved) {
    return resolveColor(defsResolved, defs, theme, visited);
  }
  
  // Then try theme (for cross-references like diffLineNumber -> diffContextBg)
  if (theme && theme[ref]) {
    const entry = theme[ref];
    const colorRef = typeof entry === "string" ? entry : entry.dark;
    return resolveColor(colorRef, defs, theme, visited);
  }
  
  throw new Error(`Unable to resolve color reference: ${ref}`);
}

/**
 * Get a theme value, preferring dark mode
 */
function getThemeValue(
  theme: Record<string, string | { dark: string; light?: string }>,
  key: string,
  defs: Record<string, string>
): string {
  const entry = theme[key];
  if (!entry) {
    throw new Error(`Missing theme key: ${key}`);
  }
  
  // Handle both string values and {dark, light} objects
  const colorRef = typeof entry === "string" ? entry : entry.dark;
  return resolveColor(colorRef, defs, theme);
}

/**
 * Get a theme value with fallback
 */
function getThemeValueWithFallback(
  theme: Record<string, string | { dark: string; light?: string }>,
  keys: string[],
  defs: Record<string, string>
): string {
  for (const key of keys) {
    const entry = theme[key];
    if (entry) {
      const colorRef = typeof entry === "string" ? entry : entry.dark;
      return resolveColor(colorRef, defs, theme);
    }
  }
  throw new Error(`Unable to resolve any of: ${keys.join(", ")}`);
}

/**
 * Try to find a bright variant of a color reference
 * e.g., "blue" -> "blueBright", "darkStep9" -> "darkStep10"
 */
function getBrightVariant(
  colorRef: string,
  defs: Record<string, string>,
  theme: Record<string, string | { dark: string; light?: string }>
): string | null {
  // Try adding "Bright" suffix
  const brightRef = colorRef + "Bright";
  if (defs[brightRef]) {
    return resolveColor(brightRef, defs, theme);
  }
  
  // Try incrementing step numbers (e.g., darkStep9 -> darkStep10)
  const stepMatch = colorRef.match(/^(.*?)(\d+)$/);
  if (stepMatch) {
    const [, prefix, num] = stepMatch;
    const nextStep = prefix + (parseInt(num) + 1);
    if (defs[nextStep]) {
      return resolveColor(nextStep, defs, theme);
    }
  }
  
  return null;
}

/**
 * Convert a TUI theme JSON to web Theme format
 */
function convertTheme(tuiTheme: TUIThemeDef, themeId: string, themeName: string): WebTheme {
  const { defs, theme } = tuiTheme;
  
  // Get primary color and try to find a bright variant for hover
  const primaryEntry = theme.primary;
  const primaryRef = typeof primaryEntry === "string" ? primaryEntry : (primaryEntry as any).dark;
  const primary = getThemeValue(theme, "primary", defs);
  
  // Try to find bright variant, otherwise fall back to primary itself
  const primaryHover = getBrightVariant(primaryRef, defs, theme) || primary;
  
  const secondary = getThemeValueWithFallback(theme, ["secondary", "accent"], defs);
  
  return {
    name: themeName,
    id: themeId,
    colors: {
      // Background colors
      background: getThemeValue(theme, "background", defs),
      backgroundAlt: getThemeValueWithFallback(theme, ["backgroundPanel", "backgroundElement"], defs),
      backgroundAccent: getThemeValueWithFallback(theme, ["backgroundElement", "backgroundPanel"], defs),
      backgroundPanel: getThemeValue(theme, "backgroundPanel", defs),
      backgroundElement: getThemeValue(theme, "backgroundElement", defs),
      
      // Foreground/text colors
      foreground: getThemeValue(theme, "text", defs),
      foregroundAlt: getThemeValue(theme, "textMuted", defs),
      textMuted: getThemeValue(theme, "textMuted", defs),
      
      // Border colors
      border: getThemeValue(theme, "border", defs),
      borderActive: getThemeValue(theme, "borderActive", defs),
      borderSubtle: getThemeValue(theme, "borderSubtle", defs),
      
      // Primary/accent colors
      primary: primary,
      primaryHover: primaryHover,
      secondary: secondary,
      accent: getThemeValue(theme, "accent", defs),
      
      // Semantic colors
      success: getThemeValue(theme, "success", defs),
      warning: getThemeValue(theme, "warning", defs),
      error: getThemeValue(theme, "error", defs),
      info: getThemeValue(theme, "info", defs),
      muted: getThemeValueWithFallback(theme, ["textMuted", "borderSubtle"], defs),
      
      // Diff colors
      diffAdded: getThemeValue(theme, "diffAdded", defs),
      diffRemoved: getThemeValue(theme, "diffRemoved", defs),
      diffContext: getThemeValue(theme, "diffContext", defs),
      diffAddedBg: getThemeValue(theme, "diffAddedBg", defs),
      diffRemovedBg: getThemeValue(theme, "diffRemovedBg", defs),
      diffContextBg: getThemeValue(theme, "diffContextBg", defs),
      diffHunkHeader: getThemeValue(theme, "diffHunkHeader", defs),
      diffHighlightAdded: getThemeValue(theme, "diffHighlightAdded", defs),
      diffHighlightRemoved: getThemeValue(theme, "diffHighlightRemoved", defs),
      diffLineNumber: getThemeValue(theme, "diffLineNumber", defs),
      diffAddedLineNumberBg: getThemeValue(theme, "diffAddedLineNumberBg", defs),
      diffRemovedLineNumberBg: getThemeValue(theme, "diffRemovedLineNumberBg", defs),
      
      // Markdown colors
      markdownHeading: getThemeValueWithFallback(theme, ["markdownHeading", "accent"], defs),
      markdownLink: getThemeValueWithFallback(theme, ["markdownLink", "primary"], defs),
      markdownCode: getThemeValueWithFallback(theme, ["markdownCode", "success"], defs),
      markdownBlockQuote: getThemeValueWithFallback(theme, ["markdownBlockQuote", "warning"], defs),
      
      // Syntax highlighting colors
      syntaxComment: getThemeValueWithFallback(theme, ["syntaxComment", "textMuted"], defs),
      syntaxKeyword: getThemeValueWithFallback(theme, ["syntaxKeyword", "accent"], defs),
      syntaxString: getThemeValueWithFallback(theme, ["syntaxString", "success"], defs),
      syntaxFunction: getThemeValueWithFallback(theme, ["syntaxFunction", "primary"], defs),
    },
  };
}

/**
 * Convert theme ID to display name
 */
function themeIdToName(id: string): string {
  const nameMap: Record<string, string> = {
    "opencode": "OpenCode",
    "tokyonight": "Tokyo Night",
    "catppuccin": "Catppuccin",
    "dracula": "Dracula",
    "nord": "Nord",
    "gruvbox": "Gruvbox",
    "monokai": "Monokai",
    "solarized": "Solarized",
    "material": "Material",
    "one-dark": "One Dark",
    "github": "GitHub",
    "nightowl": "Night Owl",
    "ayu": "Ayu",
    "palenight": "Palenight",
    "cobalt2": "Cobalt2",
    "synthwave84": "Synthwave '84",
    "rosepine": "Rosé Pine",
    "everforest": "Everforest",
    "kanagawa": "Kanagawa",
    "aura": "Aura",
    "zenburn": "Zenburn",
    "vesper": "Vesper",
    "matrix": "Matrix",
    "mellow": "Mellow",
  };
  
  return nameMap[id] || id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * Main conversion function
 */
function main() {
  const themesDir = process.argv[2] || "./tmp/themes";
  
  console.log(`Reading themes from: ${themesDir}`);
  
  const files = readdirSync(themesDir).filter(f => f.endsWith(".json")).sort();
  const themes: Record<string, WebTheme> = {};
  
  for (const file of files) {
    const themeId = file.replace(".json", "");
    const themePath = join(themesDir, file);
    
    try {
      const content = readFileSync(themePath, "utf-8");
      const tuiTheme = JSON.parse(content) as TUIThemeDef;
      const themeName = themeIdToName(themeId);
      
      themes[themeId] = convertTheme(tuiTheme, themeId, themeName);
      console.log(`✓ Converted: ${themeName} (${themeId})`);
    } catch (error) {
      console.error(`✗ Failed to convert ${themeId}:`, error);
    }
  }
  
  // Generate TypeScript output
  console.log("\n--- Generated TypeScript ---\n");
  console.log("export const themes: Record<string, Theme> = {");
  
  for (const [id, theme] of Object.entries(themes)) {
    console.log(`  "${id}": {`);
    console.log(`    name: "${theme.name}",`);
    console.log(`    id: "${theme.id}",`);
    console.log(`    colors: {`);
    
    for (const [key, value] of Object.entries(theme.colors)) {
      console.log(`      ${key}: "${value}",`);
    }
    
    console.log(`    },`);
    console.log(`  },`);
  }
  
  console.log("};");
  
  console.log(`\n✓ Converted ${Object.keys(themes).length} themes`);
}

main();
