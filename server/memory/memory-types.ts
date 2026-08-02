import type {
  Memory,
  MemoryCategory,
  MemoryImportance,
} from "@/server/repositories/memory-repository";

export type MemoryExtractionPromptMemory = Pick<
  Memory,
  "id" | "title" | "content" | "category" | "importance"
>;

export type MemoryExtractionStatus =
  | "created"
  | "updated"
  | "ignored"
  | "fallback";

export type MemoryExtractionResult = {
  status: MemoryExtractionStatus;
};

export type MemoryActionDecision =
  | {
      type: "create";
      input: {
        title: string;
        content: string;
        category: MemoryCategory;
        importance: MemoryImportance;
      };
    }
  | {
      type: "update";
      id: string;
      input: {
        title: string;
        content: string;
        category: MemoryCategory;
        importance: MemoryImportance;
        isPinned: boolean;
      };
    }
  | {
      type: "ignore";
    };

