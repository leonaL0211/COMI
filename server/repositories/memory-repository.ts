export const memoryCategories = [
  "general",
  "preference",
  "person",
  "project",
  "health",
  "routine",
  "other",
] as const;

export const memorySources = ["auto", "manual"] as const;

export type MemoryCategory = (typeof memoryCategories)[number];
export type MemorySource = (typeof memorySources)[number];
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

export type MemoryCreateInput = {
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  source: MemorySource;
  isPinned: boolean;
};

export type MemoryUpdateInput = Partial<{
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  isPinned: boolean;
}>;

export interface MemoryRepository {
  list(): Promise<Memory[]>;
  findById(memoryId: string): Promise<Memory | null>;
  create(input: MemoryCreateInput): Promise<Memory>;
  update(memoryId: string, input: MemoryUpdateInput): Promise<Memory>;
  delete(memoryId: string): Promise<void>;
}
