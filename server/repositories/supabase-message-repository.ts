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
  client_message_id: string | null;
  model: string | null;
  stop_reason: ChatStopReason | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

const messageColumns =
  "id,conversation_id,role,content,client_message_id,model,stop_reason,input_tokens,output_tokens,created_at";

export class SupabaseMessageRepository implements MessageRepository {
  private readonly client: SupabaseClient;
  private readonly ownerId: string;

  constructor(client = getSupabaseAdminClient(), ownerId?: string) {
    this.client = client;
    this.ownerId = ownerId ?? getSupabaseServerConfig().ownerId;
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

  async createUserMessage(input: {
    conversationId: string;
    content: string;
    clientMessageId?: string | null;
  }) {
    if (input.clientMessageId) {
      return this.createIdempotentUserMessage({
        conversationId: input.conversationId,
        content: input.content,
        clientMessageId: input.clientMessageId,
      });
    }

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

  private async createIdempotentUserMessage(input: {
    conversationId: string;
    content: string;
    clientMessageId: string;
  }) {
    const { data, error } = await this.client
      .from("messages")
      .upsert(
        {
          owner_id: this.ownerId,
          conversation_id: input.conversationId,
          role: "user",
          content: input.content,
          client_message_id: input.clientMessageId,
          model: null,
          stop_reason: null,
          input_tokens: null,
          output_tokens: null,
        },
        {
          onConflict: "owner_id,conversation_id,role,client_message_id",
          ignoreDuplicates: true,
        },
      )
      .select(messageColumns)
      .maybeSingle<MessageRow>();

    if (error) {
      throw toRepositoryError(error, "Failed to create message.");
    }

    if (data) {
      return mapMessage(data);
    }

    const existingMessage = await this.findUserMessageByClientMessageId({
      conversationId: input.conversationId,
      clientMessageId: input.clientMessageId,
    });

    if (!existingMessage) {
      throw new Error("Failed to reuse idempotent user message.");
    }

    return existingMessage;
  }

  private async findUserMessageByClientMessageId(input: {
    conversationId: string;
    clientMessageId: string;
  }) {
    const { data, error } = await this.client
      .from("messages")
      .select(messageColumns)
      .eq("owner_id", this.ownerId)
      .eq("conversation_id", input.conversationId)
      .eq("role", "user")
      .eq("client_message_id", input.clientMessageId)
      .maybeSingle<MessageRow>();

    if (error) {
      throw toRepositoryError(error, "Failed to find message.");
    }

    return data ? mapMessage(data) : null;
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
        client_message_id: null,
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
    clientMessageId: row.client_message_id,
    model: row.model,
    stopReason: row.stop_reason,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: row.created_at,
  };
}
