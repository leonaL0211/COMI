import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/server/supabase/admin-client";
import { getSupabaseServerConfig } from "@/server/supabase/config";
import type { Conversation, ConversationRepository } from "./conversation-repository";
import { toRepositoryError } from "./repository-error";

type ConversationRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

const conversationColumns =
  "id,title,created_at,updated_at,last_message_at";

export class SupabaseConversationRepository implements ConversationRepository {
  private readonly client: SupabaseClient;
  private readonly ownerId: string;

  constructor(client = getSupabaseAdminClient(), ownerId?: string) {
    this.client = client;
    this.ownerId = ownerId ?? getSupabaseServerConfig().ownerId;
  }

  async list() {
    const { data, error } = await this.client
      .from("conversations")
      .select(conversationColumns)
      .eq("owner_id", this.ownerId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (error) {
      throw toRepositoryError(error, "Failed to list conversations.");
    }

    return (data ?? []).map(mapConversation);
  }

  async listForBackup() {
    const { data, error } = await this.client
      .from("conversations")
      .select(conversationColumns)
      .eq("owner_id", this.ownerId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw toRepositoryError(error, "Failed to list conversations.");
    }

    return (data ?? []).map(mapConversation);
  }

  async findById(conversationId: string) {
    const { data, error } = await this.client
      .from("conversations")
      .select(conversationColumns)
      .eq("owner_id", this.ownerId)
      .eq("id", conversationId)
      .maybeSingle<ConversationRow>();

    if (error) {
      throw toRepositoryError(error, "Failed to find conversation.");
    }

    return data ? mapConversation(data) : null;
  }

  async create(input: { title?: string } = {}) {
    const { data, error } = await this.client
      .from("conversations")
      .insert({
        owner_id: this.ownerId,
        title: input.title ?? "新对话",
      })
      .select(conversationColumns)
      .single<ConversationRow>();

    if (error) {
      throw toRepositoryError(error, "Failed to create conversation.");
    }

    return mapConversation(data);
  }

  async rename(conversationId: string, title: string) {
    const { data, error } = await this.client
      .from("conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("owner_id", this.ownerId)
      .eq("id", conversationId)
      .select(conversationColumns)
      .maybeSingle<ConversationRow>();

    if (error) {
      throw toRepositoryError(error, "Failed to rename conversation.");
    }

    return data ? mapConversation(data) : null;
  }

  async touch(
    conversationId: string,
    input: { lastMessageAt?: string | null } = {},
  ) {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("conversations")
      .update({
        updated_at: now,
        ...(typeof input.lastMessageAt !== "undefined"
          ? { last_message_at: input.lastMessageAt }
          : {}),
      })
      .eq("owner_id", this.ownerId)
      .eq("id", conversationId)
      .select(conversationColumns)
      .maybeSingle<ConversationRow>();

    if (error) {
      throw toRepositoryError(error, "Failed to touch conversation.");
    }

    return data ? mapConversation(data) : null;
  }

  async delete(conversationId: string) {
    const { data, error } = await this.client
      .from("conversations")
      .delete()
      .eq("owner_id", this.ownerId)
      .eq("id", conversationId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) {
      throw toRepositoryError(error, "Failed to delete conversation.");
    }

    return Boolean(data);
  }
}

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
  };
}
