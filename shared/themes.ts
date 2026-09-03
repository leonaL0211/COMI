/**
 * "milk-tea" (奶茶莓粉) was retired as a selectable theme — the product only
 * needs Light/Dark now. The id is kept out of this union on purpose so any
 * remaining reference to it is a type error; `isThemeId` below is what
 * makes an old "milk-tea" value stored in localStorage fail safe rather
 * than throw (see useThemePreference).
 */
export type ThemeId = "sea-salt" | "sakura-night";

export type ThemeOption = {
  id: ThemeId;
  name: string;
  colors: readonly string[];
  themeColor: string;
};

export const themeStorageKey = "berry-chat-theme";
/** sea-salt (草莓巴巴露亚) is the Light mode default. */
export const defaultTheme: ThemeId = "sea-salt";

export const themeOptions: readonly ThemeOption[] = [
  {
    id: "sea-salt",
    name: "草莓巴巴露亚",
    colors: ["#A82A31", "#FCCCCC", "#FFF0D6", "#FFFDF8"],
    themeColor: "#fff0d6",
  },
  {
    id: "sakura-night",
    name: "夜樱",
    colors: ["#171217", "#4A3144", "#E9A6BA", "#FFF7FB"],
    themeColor: "#171217",
  },
] as const;

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    themeOptions.some((theme) => theme.id === value)
  );
}

export function getThemeColor(themeId: ThemeId) {
  return (
    themeOptions.find((theme) => theme.id === themeId)?.themeColor ??
    themeOptions[0].themeColor
  );
}
