import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/server/supabase/admin-client";
import { getSupabaseServerConfig } from "@/server/supabase/config";
import { RepositoryError, toRepositoryError } from "./repository-error";
import type {
  ConversationSummary,
  SummaryRepository,
  SummaryUpsertInput,
} from "./summary-repository";

type SummaryRow = {
  conversation_id: string;
  content: string;
  covered_through_message_id: string;
  covered_message_count: number;
  created_at: string;
  updated_at: string;
};

const summaryColumns =
  "conversation_id,content,covered_through_message_id,covered_message_count,created_at,updated_at";

export class SupabaseSummaryRepository implements SummaryRepository {
  private readonly client: SupabaseClient;
  private readonly ownerId: string;

  constructor(client = getSupabaseAdminClient()) {
    this.client = client;
    this.ownerId = getSupabaseServerConfig().ownerId;
  }

  async findByConversation(conversationId: string) {
    const { data, error } = await this.client
      .from("conversation_summaries")
      .select(summaryColumns)
      .eq("owner_id", this.ownerId)
      .eq("conversation_id", conversationId)
      .maybeSingle<SummaryRow>();

    if (error) {
      throw toRepositoryError(error, "Failed to find conversation summary.");
    }

    return data ? mapSummary(data) : null;
  }

  async upsert(input: SummaryUpsertInput) {
    const { data, error } = await this.client
      .from("conversation_summaries")
      .upsert(
        {
          conversation_id: input.conversationId,
          owner_id: this.ownerId,
          content: input.content,
          covered_through_message_id: input.coveredThroughMessageId,
          covered_message_count: input.coveredMessageCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id" },
      )
      .select(summaryColumns)
      .single<SummaryRow>();

    if (error) {
      throw toSummaryRepositoryError(error, "Failed to save conversation summary.");
    }

    return mapSummary(data);
  }
}

function mapSummary(row: SummaryRow): ConversationSummary {
  return {
    conversationId: row.conversation_id,
    content: row.content,
    coveredThroughMessageId: row.covered_through_message_id,
    coveredMessageCount: row.covered_message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSummaryRepositoryError(error: unknown, fallbackMessage: string) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "23503" || error.code === "23514")
  ) {
    return new RepositoryError(
      "Conversation summary checkpoint is invalid.",
      400,
    );
  }

  return toRepositoryError(error, fallbackMessage);
}
