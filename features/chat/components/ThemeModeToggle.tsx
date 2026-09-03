"use client";

import { GlassButton } from "./GlassButton";
import type { ThemeId } from "@/shared/themes";

type ThemeModeToggleProps = {
  selectedTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
};

/**
 * Light/Dark toggle for the two remaining themes (sea-salt = Light,
 * sakura-night = Dark). Intentionally small and out of the way — floats in
 * the bottom-right of the main chat area, above the composer and clear of
 * the memory toast band (see .theme-mode-toggle in globals.css).
 */
export function ThemeModeToggle({
  selectedTheme,
  onSelectTheme,
}: ThemeModeToggleProps) {
  const isDark = selectedTheme === "sakura-night";

  return (
    <GlassButton
      className="theme-mode-toggle"
      type="button"
      label={isDark ? "切换到日间模式" : "切换到夜间模式"}
      aria-pressed={isDark}
      onClick={() => onSelectTheme(isDark ? "sea-salt" : "sakura-night")}
    >
      {isDark ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="theme-mode-toggle-icon"
          fill="currentColor"
        >
          <path d="M20.6 15.6a8.6 8.6 0 0 1-10.9-11A8.6 8.6 0 1 0 20.6 15.6Z" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="theme-mode-toggle-icon"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path
            d="M12 2.5v2.4M12 19.1v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </GlassButton>
  );
}
