"use client";

import { useEffect, useState } from "react";
import {
  defaultTheme,
  getThemeColor,
  isThemeId,
  themeStorageKey,
  type ThemeId,
} from "@/shared/themes";

export function useThemePreference() {
  const [selectedTheme, setSelectedThemeState] =
    useState<ThemeId>(defaultTheme);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(themeStorageKey);
      const theme = isThemeId(stored) ? stored : defaultTheme;
      applyTheme(theme);
      setSelectedThemeState(theme);
    } catch {
      applyTheme(defaultTheme);
    }
  }, []);

  function setSelectedTheme(theme: ThemeId) {
    setSelectedThemeState(theme);
    applyTheme(theme);

    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch {
      // Keep the in-memory theme if localStorage is unavailable.
    }
  }

  return {
    selectedTheme,
    setSelectedTheme,
  };
}

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", getThemeColor(theme));
}
