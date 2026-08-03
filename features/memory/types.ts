export const memoryCategories = [
  "general",
  "preference",
  "person",
  "project",
  "health",
  "routine",
  "other",
] as const;

export type MemoryCategory = (typeof memoryCategories)[number];
export type MemorySource = "auto" | "manual";
export type MemoryImportance = 1 | 2 | 3 | 4 | 5;

export type Memory = {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  source: MemorySource;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MemoryFormInput = {
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  isPinned: boolean;
};

export type MemoryUpdateInput = Partial<MemoryFormInput>;

