import {
  memoryCategories,
  type MemoryCategory,
  type MemoryImportance,
  type MemoryUpdateInput,
} from "@/server/repositories/memory-repository";

const forbiddenFields = new Set([
  "id",
  "ownerId",
  "owner_id",
  "source",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
]);
const createAllowedFields = new Set([
  "title",
  "content",
  "category",
  "importance",
  "isPinned",
]);
const updateAllowedFields = createAllowedFields;
const maxTitleLength = 160;
const maxContentLength = 2000;

export type MemoryCreateValidationResult =
  | {
      ok: true;
      input: {
        title: string;
        content: string;
        category: MemoryCategory;
        importance: MemoryImportance;
        isPinned: boolean;
      };
    }
  | {
      ok: false;
    };

export type MemoryUpdateValidationResult =
  | {
      ok: true;
      input: MemoryUpdateInput;
    }
  | {
      ok: false;
    };

export function validateMemoryCreateRequest(
  body: Record<string, unknown>,
): MemoryCreateValidationResult {
  if (hasRejectedFields(body, createAllowedFields)) {
    return { ok: false };
  }

  const title = readTitle(body.title);
  const content = readContent(body.content);
  const category = readCategory(body.category);
  const importance = readImportance(body.importance);
  const isPinned =
    typeof body.isPinned === "undefined" ? false : readBoolean(body.isPinned);

  if (!title || !content || !category || !importance || isPinned === null) {
    return { ok: false };
  }

  return {
    ok: true,
    input: {
      title,
      content,
      category,
      importance,
      isPinned,
    },
  };
}

export function validateMemoryUpdateRequest(
  body: Record<string, unknown>,
): MemoryUpdateValidationResult {
  if (
    hasRejectedFields(body, updateAllowedFields) ||
    !Object.keys(body).some((key) => updateAllowedFields.has(key))
  ) {
    return { ok: false };
  }

  const input: MemoryUpdateInput = {};

  if (typeof body.title !== "undefined") {
    const title = readTitle(body.title);
    if (!title) return { ok: false };
    input.title = title;
  }

  if (typeof body.content !== "undefined") {
    const content = readContent(body.content);
    if (!content) return { ok: false };
    input.content = content;
  }

  if (typeof body.category !== "undefined") {
    const category = readCategory(body.category);
    if (!category) return { ok: false };
    input.category = category;
  }

  if (typeof body.importance !== "undefined") {
    const importance = readImportance(body.importance);
    if (!importance) return { ok: false };
    input.importance = importance;
  }

  if (typeof body.isPinned !== "undefined") {
    const isPinned = readBoolean(body.isPinned);
    if (isPinned === null) return { ok: false };
    input.isPinned = isPinned;
  }

  return {
    ok: true,
    input,
  };
}

function hasRejectedFields(
  body: Record<string, unknown>,
  allowedFields: Set<string>,
) {
  return Object.keys(body).some(
    (key) => forbiddenFields.has(key) || !allowedFields.has(key),
  );
}

function readTitle(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const title = value.trim();

  return title && title.length <= maxTitleLength ? title : null;
}

function readContent(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const content = value.trim();

  return content && content.length <= maxContentLength ? content : null;
}

function readCategory(value: unknown): MemoryCategory | null {
  return typeof value === "string" &&
    memoryCategories.includes(value as MemoryCategory)
    ? (value as MemoryCategory)
    : null;
}

function readImportance(value: unknown): MemoryImportance | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
    ? (value as MemoryImportance)
    : null;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

