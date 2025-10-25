import { useState, useEffect } from "react";
import { applyTheme, getStoredTheme, themes } from "@/lib/themes";

const DEFAULT_THEME_ID = "catppuccin";

const resolveThemeId = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (themes[trimmed]) return trimmed;

  const normalizedKey = trimmed.toLowerCase();
  const directMatch = Object.keys(themes).find(
    (key) => key.toLowerCase() === normalizedKey,
  );
  if (directMatch) return directMatch;

  const nameMatch = Object.values(themes).find(
    (theme) => theme.name.toLowerCase() === normalizedKey,
  );
  return nameMatch?.id ?? null;
};

export function useTheme(configTheme?: string) {
  const [currentTheme, setCurrentTheme] = useState<string>(DEFAULT_THEME_ID);

  useEffect(() => {
    const storedTheme = resolveThemeId(getStoredTheme());
    const configThemeId = resolveThemeId(configTheme);
    const themeToApply = configThemeId || storedTheme || DEFAULT_THEME_ID;

    setCurrentTheme((prev) => (prev === themeToApply ? prev : themeToApply));
    applyTheme(themeToApply);
  }, [configTheme]);

  const changeTheme = (themeId: string, saveToLocalStorage = true) => {
    if (themes[themeId]) {
      applyTheme(themeId);
      setCurrentTheme(themeId);
      if (saveToLocalStorage) {
        localStorage.setItem("opencode-theme", themeId);
      }
    }
  };

  return {
    currentTheme,
    changeTheme,
    themes,
  };
}
