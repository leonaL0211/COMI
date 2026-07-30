import { ChatService } from "@/server/chat/chat-service";
import { ChatProviderError } from "@/server/providers/chat-provider";
import { SupabaseConversationRepository } from "@/server/repositories/supabase-conversation-repository";
import { SupabaseMessageRepository } from "@/server/repositories/supabase-message-repository";
import { buildChatContext } from "@/server/summary/context-builder";
import { SummaryService } from "@/server/summary/summary-service";
import type {
  Conversation,
  ConversationRepository,
} from "@/server/repositories/conversation-repository";
import type {
  MessageRepository,
  PersistedMessage,
} from "@/server/repositories/message-repository";
import type { ChatMessage } from "@/shared/chat-types";

export type PersistentChatResult = {
  conversation: Conversation;
  userMessage: PersistedMessage;
  assistantMessage: PersistedMessage;
};

export class PersistentChatServiceError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "PersistentChatServiceError";
  }
}

export class PersistentChatService {
  constructor(
    private readonly conversations: ConversationRepository =
      new SupabaseConversationRepository(),
    private readonly messages: MessageRepository = new SupabaseMessageRepository(),
    private readonly chatService?: ChatService,
    private readonly summaryService: SummaryService = new SummaryService(),
  ) {}

  async sendMessage(input: {
    conversationId: string;
    content: string;
  }): Promise<PersistentChatResult> {
    const existingConversation = await this.conversations.findById(
      input.conversationId,
    );

    if (!existingConversation) {
      throw new PersistentChatServiceError("Conversation not found.", 404);
    }

    const userMessage = await this.messages.createUserMessage({
      conversationId: input.conversationId,
      content: input.content,
    });
    const userTouchedConversation =
      (await this.conversations.touch(input.conversationId, {
        lastMessageAt: userMessage.createdAt,
      })) ?? existingConversation;
    const history = await this.messages.listByConversation(input.conversationId);
    const summaryResult = await this.summaryService.summarizeIfNeeded({
      conversationId: input.conversationId,
      messages: history,
      currentUserMessageId: userMessage.id,
    });
    const chatContext = buildChatContext({
      messages: history,
      currentUserMessageId: userMessage.id,
      summaryResult,
    });
    const completion = await this.createCompletion(chatContext);
    const assistantContent = completion.text.trim();

    if (!assistantContent) {
      throw new PersistentChatServiceError(
        "AI service returned an empty response.",
        502,
      );
    }

    const assistantMessage = await this.messages.createAssistantMessage({
      conversationId: input.conversationId,
      content: assistantContent,
      model: completion.model ?? null,
      stopReason: completion.stopReason,
      inputTokens: completion.usage?.inputTokens ?? null,
      outputTokens: completion.usage?.outputTokens ?? null,
    });
    const conversation =
      (await this.conversations.touch(input.conversationId, {
        lastMessageAt: assistantMessage.createdAt,
      })) ?? userTouchedConversation;

    return {
      conversation,
      userMessage,
      assistantMessage,
    };
  }

  private async createCompletion(messages: ChatMessage[]) {
    try {
      return await (this.chatService ?? new ChatService()).sendMessage(
        messages,
      );
    } catch (error) {
      if (error instanceof ChatProviderError) {
        throw new PersistentChatServiceError(
          "AI reply failed. Please try again later.",
          error.status,
        );
      }

      throw error;
    }
  }
}
