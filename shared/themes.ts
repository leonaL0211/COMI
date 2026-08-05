export type ThemeId = "milk-tea" | "sea-salt" | "sakura-night";

export type ThemeOption = {
  id: ThemeId;
  name: string;
  colors: readonly string[];
  themeColor: string;
};

export const themeStorageKey = "berry-chat-theme";
export const defaultTheme: ThemeId = "milk-tea";

export const themeOptions: readonly ThemeOption[] = [
  {
    id: "milk-tea",
    name: "奶茶莓粉",
    colors: ["#968C83", "#D6D2C4", "#FFF5EA", "#F7DAD9"],
    themeColor: "#fff7ef",
  },
  {
    id: "sea-salt",
    name: "草莓巴巴露亚",
    colors: ["#A82A31", "#FCCCCC", "#FFF0D6", "#FFFDF8"],
    themeColor: "#fff0d6",
  },
  {
    id: "sakura-night",
    name: "夜樱",
    colors: ["#E2A6B8", "#4A3542", "#211B22", "#F5EDF1"],
    themeColor: "#211b22",
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
