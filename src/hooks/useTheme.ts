import { useState, useEffect } from "react";
import { applyTheme, getStoredTheme, themes } from "@/lib/themes";

export function useTheme(configTheme?: string) {
  const [currentTheme, setCurrentTheme] = useState<string>("catppuccin");

  useEffect(() => {
    const storedTheme = getStoredTheme();
    const themeToApply = configTheme || storedTheme;

    if (themes[themeToApply]) {
      setCurrentTheme(themeToApply);
      applyTheme(themeToApply);
    }
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
