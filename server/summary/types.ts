import type { ConversationSummary } from "@/server/repositories/summary-repository";
import type { PersistedMessage } from "@/server/repositories/message-repository";

export type SummaryPolicyInput = {
  messages: PersistedMessage[];
  currentUserMessageId: string;
  existingSummary: ConversationSummary | null;
};

export type SummaryPolicyDecision =
  | {
      status: "invalid_checkpoint";
      reason: string;
    }
  | {
      status: "not_needed";
      summary: ConversationSummary | null;
    }
  | {
      status: "should_summarize";
      previousSummary: ConversationSummary | null;
      messagesToSummarize: PersistedMessage[];
      checkpointMessage: PersistedMessage;
      coveredMessageCount: number;
    };

export type SummaryServiceResult =
  | {
      status: "not_needed";
      summary: ConversationSummary | null;
    }
  | {
      status: "updated";
      summary: ConversationSummary;
    }
  | {
      status: "fallback";
      reason: SummaryFallbackReason;
    };

export type SummaryFallbackReason =
  | "invalid_checkpoint"
  | "provider_error"
  | "empty_summary"
  | "max_tokens"
  | "save_failed";
