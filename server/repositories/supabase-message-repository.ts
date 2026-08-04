import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatStopReason } from "@/shared/chat-types";
import { getSupabaseAdminClient } from "@/server/supabase/admin-client";
import { getSupabaseServerConfig } from "@/server/supabase/config";
import type { MessageRepository, PersistedMessage } from "./message-repository";
import { toRepositoryError } from "./repository-error";

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  stop_reason: ChatStopReason | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

const messageColumns =
  "id,conversation_id,role,content,model,stop_reason,input_tokens,output_tokens,created_at";

export class SupabaseMessageRepository implements MessageRepository {
  private readonly client: SupabaseClient;
  private readonly ownerId: string;

  constructor(client = getSupabaseAdminClient()) {
    this.client = client;
    this.ownerId = getSupabaseServerConfig().ownerId;
  }

  async listByConversation(conversationId: string) {
    const { data, error } = await this.client
      .from("messages")
      .select(messageColumns)
      .eq("owner_id", this.ownerId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      throw toRepositoryError(error, "Failed to list messages.");
    }

    return (data ?? []).map(mapMessage);
  }

  async listForBackup() {
    const { data, error } = await this.client
      .from("messages")
      .select(messageColumns)
      .eq("owner_id", this.ownerId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw toRepositoryError(error, "Failed to list messages.");
    }

    return (data ?? []).map(mapMessage);
  }

  async createUserMessage(input: { conversationId: string; content: string }) {
    return this.createMessage({
      conversationId: input.conversationId,
      role: "user",
      content: input.content,
    });
  }

  async createAssistantMessage(input: {
    conversationId: string;
    content: string;
    model?: string | null;
    stopReason?: ChatStopReason | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
  }) {
    return this.createMessage({
      conversationId: input.conversationId,
      role: "assistant",
      content: input.content,
      model: input.model ?? null,
      stopReason: input.stopReason ?? null,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
    });
  }

  private async createMessage(input: {
    conversationId: string;
    role: "user" | "assistant";
    content: string;
    model?: string | null;
    stopReason?: ChatStopReason | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
  }) {
    const { data, error } = await this.client
      .from("messages")
      .insert({
        owner_id: this.ownerId,
        conversation_id: input.conversationId,
        role: input.role,
        content: input.content,
        model: input.model ?? null,
        stop_reason: input.stopReason ?? null,
        input_tokens: input.inputTokens ?? null,
        output_tokens: input.outputTokens ?? null,
      })
      .select(messageColumns)
      .single<MessageRow>();

    if (error) {
      throw toRepositoryError(error, "Failed to create message.");
    }

    return mapMessage(data);
  }
}

function mapMessage(row: MessageRow): PersistedMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    model: row.model,
    stopReason: row.stop_reason,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: row.created_at,
  };
}
