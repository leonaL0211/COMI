import type { Memory, MemoryCategory } from "./types";

/**
 * Presentation-only grouping on top of the existing `memories.category`
 * column. This intentionally does not touch the database schema or the
 * `memoryCategories` check constraint — it only decides how the About Me
 * experience clusters the existing 7 categories for the user.
 */
export type MemoryGroupId =
  | "about"
  | "preferences"
  | "projects"
  | "health"
  | "other";

export type MemoryGroupDefinition = {
  id: MemoryGroupId;
  label: string;
  description: string;
  categories: MemoryCategory[];
};

export const MEMORY_GROUPS: MemoryGroupDefinition[] = [
  {
    id: "about",
    label: "关于我",
    description: "基本信息与重要的人",
    categories: ["person", "general"],
  },
  {
    id: "preferences",
    label: "偏好与习惯",
    description: "喜欢什么、平时怎么做",
    categories: ["preference", "routine"],
  },
  {
    id: "projects",
    label: "最近在做",
    description: "进行中的项目与目标",
    categories: ["project"],
  },
  {
    id: "health",
    label: "健康与状态",
    description: "长期的健康相关信息",
    categories: ["health"],
  },
  {
    id: "other",
    label: "其他",
    description: "还没有明确归类的记忆",
    categories: ["other"],
  },
];

export function groupMemoriesForDisplay(memories: Memory[]) {
  return MEMORY_GROUPS.map((group) => ({
    group,
    memories: memories.filter((memory) =>
      group.categories.includes(memory.category),
    ),
  })).filter((entry) => entry.memories.length > 0);
}
