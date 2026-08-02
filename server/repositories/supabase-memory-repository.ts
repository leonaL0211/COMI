import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/server/supabase/admin-client";
import { getSupabaseServerConfig, isValidUuid } from "@/server/supabase/config";
import { RepositoryError, toRepositoryError } from "./repository-error";
import {
  memoryCategories,
  memorySources,
  type Memory,
  type MemoryCategory,
  type MemoryCreateInput,
  type MemoryImportance,
  type MemoryRepository,
  type MemorySource,
  type MemoryUpdateInput,
} from "./memory-repository";

type MemoryRow = {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  source: MemorySource;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

const memoryColumns =
  "id,title,content,category,importance,source,is_pinned,created_at,updated_at";
const maxTitleLength = 160;
const maxContentLength = 2000;

export class SupabaseMemoryRepository implements MemoryRepository {
  private readonly client: SupabaseClient;
  private readonly ownerId: string;

  constructor(client = getSupabaseAdminClient()) {
    this.client = client;
    this.ownerId = getSupabaseServerConfig().ownerId;
  }

  async list() {
    const { data, error } = await this.client
      .from("memories")
      .select(memoryColumns)
      .eq("owner_id", this.ownerId)
      .order("is_pinned", { ascending: false })
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      throw toRepositoryError(error, "Failed to list memories.");
    }

    return (data ?? []).map(mapMemory);
  }

  async findById(memoryId: string) {
    assertUuid(memoryId);

    const { data, error } = await this.client
      .from("memories")
      .select(memoryColumns)
      .eq("owner_id", this.ownerId)
      .eq("id", memoryId)
      .maybeSingle<MemoryRow>();

    if (error) {
      throw toRepositoryError(error, "Failed to find memory.");
    }

    return data ? mapMemory(data) : null;
  }

  async create(input: MemoryCreateInput) {
    const memory = validateCreateInput(input);
    const { data, error } = await this.client
      .from("memories")
      .insert({
        owner_id: this.ownerId,
        title: memory.title,
        content: memory.content,
        category: memory.category,
        importance: memory.importance,
        source: memory.source,
        is_pinned: memory.isPinned,
      })
      .select(memoryColumns)
      .single<MemoryRow>();

    if (error) {
      throw toMemoryRepositoryError(error, "Failed to create memory.");
    }

    return mapMemory(data);
  }

  async update(memoryId: string, input: MemoryUpdateInput) {
    assertUuid(memoryId);
    const update = validateUpdateInput(input);
    const { data, error } = await this.client
      .from("memories")
      .update({
        ...update,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", this.ownerId)
      .eq("id", memoryId)
      .select(memoryColumns)
      .maybeSingle<MemoryRow>();

    if (error) {
      throw toMemoryRepositoryError(error, "Failed to update memory.");
    }

    if (!data) {
      throw new RepositoryError("Memory not found.", 404);
    }

    return mapMemory(data);
  }

  async delete(memoryId: string) {
    assertUuid(memoryId);

    const { data, error } = await this.client
      .from("memories")
      .delete()
      .eq("owner_id", this.ownerId)
      .eq("id", memoryId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) {
      throw toRepositoryError(error, "Failed to delete memory.");
    }

    if (!data) {
      throw new RepositoryError("Memory not found.", 404);
    }
  }
}

function validateCreateInput(input: MemoryCreateInput) {
  return {
    title: normalizeTitle(input.title),
    content: normalizeContent(input.content),
    category: normalizeCategory(input.category),
    importance: normalizeImportance(input.importance),
    source: normalizeSource(input.source),
    isPinned: normalizeBoolean(input.isPinned, "isPinned"),
  };
}

function validateUpdateInput(input: MemoryUpdateInput) {
  const update: Partial<{
    title: string;
    content: string;
    category: MemoryCategory;
    importance: MemoryImportance;
    is_pinned: boolean;
  }> = {};

  if (typeof input.title !== "undefined") {
    update.title = normalizeTitle(input.title);
  }

  if (typeof input.content !== "undefined") {
    update.content = normalizeContent(input.content);
  }

  if (typeof input.category !== "undefined") {
    update.category = normalizeCategory(input.category);
  }

  if (typeof input.importance !== "undefined") {
    update.importance = normalizeImportance(input.importance);
  }

  if (typeof input.isPinned !== "undefined") {
    update.is_pinned = normalizeBoolean(input.isPinned, "isPinned");
  }

  return update;
}

function assertUuid(memoryId: string) {
  if (!isValidUuid(memoryId)) {
    throw new RepositoryError("Invalid memory id.", 400);
  }
}

function normalizeTitle(value: string) {
  if (typeof value !== "string") {
    throw new RepositoryError("Memory title must be a string.", 400);
  }

  const title = value.trim();

  if (!title || title.length > maxTitleLength) {
    throw new RepositoryError(
      `Memory title must be 1 to ${maxTitleLength} characters.`,
      400,
    );
  }

  return title;
}

function normalizeContent(value: string) {
  if (typeof value !== "string") {
    throw new RepositoryError("Memory content must be a string.", 400);
  }

  const content = value.trim();

  if (!content || content.length > maxContentLength) {
    throw new RepositoryError(
      `Memory content must be 1 to ${maxContentLength} characters.`,
      400,
    );
  }

  return content;
}

function normalizeCategory(value: MemoryCategory) {
  if (!memoryCategories.includes(value)) {
    throw new RepositoryError("Invalid memory category.", 400);
  }

  return value;
}

function normalizeImportance(value: MemoryImportance) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new RepositoryError("Memory importance must be 1 to 5.", 400);
  }

  return value;
}

function normalizeSource(value: MemorySource) {
  if (!memorySources.includes(value)) {
    throw new RepositoryError("Invalid memory source.", 400);
  }

  return value;
}

function normalizeBoolean(value: boolean, field: string) {
  if (typeof value !== "boolean") {
    throw new RepositoryError(`Memory ${field} must be a boolean.`, 400);
  }

  return value;
}

function mapMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    importance: row.importance,
    source: row.source,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMemoryRepositoryError(error: unknown, fallbackMessage: string) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23514"
  ) {
    return new RepositoryError("Memory data is invalid.", 400);
  }

  return toRepositoryError(error, fallbackMessage);
}
