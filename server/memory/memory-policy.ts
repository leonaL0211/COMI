import {
  memoryCategories,
  type Memory,
  type MemoryCategory,
  type MemoryImportance,
} from "@/server/repositories/memory-repository";
import type {
  MemoryActionDecision,
  MemoryExtractionPromptMemory,
} from "./memory-types";

export const MAX_EXISTING_MEMORIES_FOR_EXTRACTION = 50;
export const MAX_EXISTING_MEMORY_CHARACTERS = 12000;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxTitleLength = 160;
const maxContentLength = 2000;

export function selectMemoriesForExtraction(
  memories: Memory[],
): MemoryExtractionPromptMemory[] {
  const selected: MemoryExtractionPromptMemory[] = [];
  let usedCharacters = 0;

  for (const memory of memories) {
    if (selected.length >= MAX_EXISTING_MEMORIES_FOR_EXTRACTION) {
      break;
    }

    const promptMemory = toPromptMemory(memory);
    const characterCount = countPromptMemoryCharacters(promptMemory);

    if (usedCharacters + characterCount > MAX_EXISTING_MEMORY_CHARACTERS) {
      break;
    }

    selected.push(promptMemory);
    usedCharacters += characterCount;
  }

  return selected;
}

export function decideMemoryAction(input: {
  payload: unknown;
  existingMemories: Memory[];
  providedMemories: MemoryExtractionPromptMemory[];
}): MemoryActionDecision {
  if (!isRecord(input.payload) || !isRecord(input.payload.action)) {
    return { type: "ignore" };
  }

  const action = input.payload.action;

  if (action.type === "ignore") {
    return { type: "ignore" };
  }

  if (action.type === "create") {
    return decideCreateAction(action, input.existingMemories);
  }

  if (action.type === "update") {
    return decideUpdateAction(action, input.providedMemories, input.existingMemories);
  }

  return { type: "ignore" };
}

function decideCreateAction(
  action: Record<string, unknown>,
  existingMemories: Memory[],
): MemoryActionDecision {
  if (typeof action.id !== "undefined") {
    return { type: "ignore" };
  }

  const fields = readMemoryFields(action);

  if (!fields) {
    return { type: "ignore" };
  }

  const normalizedTitle = normalizeComparableText(fields.title);
  const normalizedContent = normalizeComparableText(fields.content);

  if (
    existingMemories.some(
      (memory) => normalizeComparableText(memory.content) === normalizedContent,
    )
  ) {
    return { type: "ignore" };
  }

  if (
    existingMemories.some(
      (memory) => normalizeComparableText(memory.title) === normalizedTitle,
    )
  ) {
    return { type: "ignore" };
  }

  return {
    type: "create",
    input: fields,
  };
}

function decideUpdateAction(
  action: Record<string, unknown>,
  providedMemories: MemoryExtractionPromptMemory[],
  existingMemories: Memory[],
): MemoryActionDecision {
  if (typeof action.id !== "string" || !uuidPattern.test(action.id)) {
    return { type: "ignore" };
  }

  if (!providedMemories.some((memory) => memory.id === action.id)) {
    return { type: "ignore" };
  }

  const existingMemory = existingMemories.find((memory) => memory.id === action.id);

  if (!existingMemory) {
    return { type: "ignore" };
  }

  const fields = readMemoryFields(action);

  if (!fields) {
    return { type: "ignore" };
  }

  const unchanged =
    normalizeComparableText(existingMemory.title) ===
      normalizeComparableText(fields.title) &&
    normalizeComparableText(existingMemory.content) ===
      normalizeComparableText(fields.content) &&
    existingMemory.category === fields.category &&
    existingMemory.importance === fields.importance;

  if (unchanged) {
    return { type: "ignore" };
  }

  return {
    type: "update",
    id: action.id,
    input: {
      ...fields,
      isPinned: existingMemory.isPinned,
    },
  };
}

function readMemoryFields(action: Record<string, unknown>) {
  const title = normalizeTitle(action.title);
  const content = normalizeContent(action.content);
  const category = normalizeCategory(action.category);
  const importance = normalizeImportance(action.importance);

  if (!title || !content || !category || !importance) {
    return null;
  }

  return {
    title,
    content,
    category,
    importance,
  };
}

function toPromptMemory(memory: Memory): MemoryExtractionPromptMemory {
  return {
    id: memory.id,
    title: memory.title,
    content: memory.content,
    category: memory.category,
    importance: memory.importance,
  };
}

function countPromptMemoryCharacters(memory: MemoryExtractionPromptMemory) {
  return (
    memory.id.length +
    memory.title.length +
    memory.content.length +
    memory.category.length +
    String(memory.importance).length
  );
}

function normalizeTitle(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const title = value.trim();

  return title && title.length <= maxTitleLength ? title : null;
}

function normalizeContent(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const content = value.trim();

  return content && content.length <= maxContentLength ? content : null;
}

function normalizeCategory(value: unknown): MemoryCategory | null {
  return typeof value === "string" &&
    memoryCategories.includes(value as MemoryCategory)
    ? (value as MemoryCategory)
    : null;
}

function normalizeImportance(value: unknown): MemoryImportance | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
    ? (value as MemoryImportance)
    : null;
}

function normalizeComparableText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
