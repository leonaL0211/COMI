import type { ChatProvider } from "@/server/providers/chat-provider";
import { OriginRouterProvider } from "@/server/providers/originrouter-provider";
import { SupabaseSummaryRepository } from "@/server/repositories/supabase-summary-repository";
import type {
  ConversationSummary,
  SummaryRepository,
} from "@/server/repositories/summary-repository";
import type { PersistedMessage } from "@/server/repositories/message-repository";
import { buildSummaryPrompt } from "./summary-prompt";
import { decideSummaryPolicy } from "./summary-policy";
import type { SummaryFallbackReason, SummaryServiceResult } from "./types";

const summaryMaxOutputTokens = 1536;

type SummaryCompletionResult =
  | {
      status: "ok";
      content: string;
    }
  | {
      status: "fallback";
      reason: SummaryFallbackReason;
    };

export class SummaryService {
  /** See PersistentChatService — `ownerId` must be resolved by the caller. */
  constructor(
    ownerId?: string,
    private readonly summaries: SummaryRepository =
      new SupabaseSummaryRepository(undefined, ownerId),
    private readonly provider: ChatProvider = new OriginRouterProvider(),
  ) {}

  async summarizeIfNeeded(input: {
    conversationId: string;
    messages: PersistedMessage[];
    currentUserMessageId: string;
  }): Promise<SummaryServiceResult> {
    let existingSummary = null;

    try {
      existingSummary = await this.summaries.findByConversation(
        input.conversationId,
      );
    } catch {
      return { status: "fallback", reason: "invalid_checkpoint" };
    }

    const decision = decideSummaryPolicy({
      messages: input.messages,
      currentUserMessageId: input.currentUserMessageId,
      existingSummary,
    });

    if (decision.status === "invalid_checkpoint") {
      return { status: "fallback", reason: "invalid_checkpoint" };
    }

    if (decision.status === "not_needed") {
      return {
        status: "not_needed",
        summary: decision.summary,
      };
    }

    const completion = await this.createSummaryCompletion({
      previousSummary: decision.previousSummary,
      messagesToSummarize: decision.messagesToSummarize,
    });

    if (completion.status === "fallback") {
      return completion;
    }

    try {
      const summary = await this.summaries.upsert({
        conversationId: input.conversationId,
        content: completion.content,
        coveredThroughMessageId: decision.checkpointMessage.id,
        coveredMessageCount: decision.coveredMessageCount,
      });

      return {
        status: "updated",
        summary,
      };
    } catch {
      return fallback("save_failed");
    }
  }

  private async createSummaryCompletion(input: {
    previousSummary: ConversationSummary | null;
    messagesToSummarize: PersistedMessage[];
  }): Promise<SummaryCompletionResult> {
    try {
      const completion = await this.provider.createChatCompletion({
        messages: buildSummaryPrompt({
          previousSummary: input.previousSummary,
          messagesToSummarize: input.messagesToSummarize,
        }),
        maxOutputTokens: summaryMaxOutputTokens,
      });
      const content = completion.text.trim();

      if (!content) {
        return fallback("empty_summary");
      }

      if (completion.stopReason === "max_tokens") {
        return fallback("max_tokens");
      }

      return {
        status: "ok",
        content,
      };
    } catch {
      return fallback("provider_error");
    }
  }
}

function fallback(reason: SummaryFallbackReason): {
  status: "fallback";
  reason: SummaryFallbackReason;
} {
  return {
    status: "fallback",
    reason,
  };
}
