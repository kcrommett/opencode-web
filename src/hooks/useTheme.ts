import { useState, useEffect } from "react";
import { applyTheme, getStoredTheme, themes } from "@/lib/themes";

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<string>("catppuccin");

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setCurrentTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const changeTheme = (themeId: string) => {
    if (themes[themeId]) {
      applyTheme(themeId);
      setCurrentTheme(themeId);
    }
  };

  return {
    currentTheme,
    changeTheme,
    themes,
  };
}
