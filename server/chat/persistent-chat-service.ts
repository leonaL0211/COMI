import { ChatService } from "@/server/chat/chat-service";
import { buildMemoryContextMessage } from "@/server/memory/memory-context-builder";
import { MemoryService } from "@/server/memory/memory-service";
import { ChatProviderError } from "@/server/providers/chat-provider";
import { SupabaseConversationRepository } from "@/server/repositories/supabase-conversation-repository";
import { SupabaseMemoryRepository } from "@/server/repositories/supabase-memory-repository";
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
import type { MemoryRepository } from "@/server/repositories/memory-repository";
import { resolveChatProviderModelId } from "@/server/providers/chat-model-resolver";
import type { ChatMessage } from "@/shared/chat-types";
import type { ChatModelKey } from "@/shared/chat-models";
import type { MemoryExtractionResult } from "@/server/memory/memory-types";

export type PersistentChatResult = {
  conversation: Conversation;
  userMessage: PersistedMessage;
  assistantMessage: PersistedMessage;
  memoryExtraction: MemoryExtractionResult;
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
  /**
   * `ownerId` must be resolved by the caller (see
   * server/auth/owner-context.ts `resolveOwnerId()`) and passed in
   * explicitly — this class never reads cookies/session state itself. It
   * only feeds the default repository instances below; callers that pass
   * their own repository instances can ignore it.
   */
  constructor(
    ownerId: string,
    private readonly conversations: ConversationRepository =
      new SupabaseConversationRepository(undefined, ownerId),
    private readonly messages: MessageRepository = new SupabaseMessageRepository(
      undefined,
      ownerId,
    ),
    private readonly chatService?: ChatService,
    private readonly summaryService: SummaryService = new SummaryService(ownerId),
    private readonly memories: MemoryRepository = new SupabaseMemoryRepository(
      undefined,
      ownerId,
    ),
    private readonly memoryService?: MemoryService,
  ) {}

  async sendMessage(input: {
    conversationId: string;
    content: string;
    model: ChatModelKey;
    clientMessageId?: string | null;
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
      clientMessageId: input.clientMessageId ?? null,
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
    const memoryContextMessage = await this.loadMemoryContextMessage();
    const completion = await this.createCompletion(
      [...(memoryContextMessage ? [memoryContextMessage] : []), ...chatContext],
      resolveChatProviderModelId(input.model),
    );
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

    const memoryExtraction = await this.extractMemoryFromTurn({
      userMessage,
      assistantMessage,
    });

    return {
      conversation,
      userMessage,
      assistantMessage,
      memoryExtraction,
    };
  }

  private async createCompletion(messages: ChatMessage[], model: string) {
    try {
      return await (this.chatService ?? new ChatService()).sendMessage(
        messages,
        { model },
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

  private async loadMemoryContextMessage() {
    try {
      return buildMemoryContextMessage(await this.memories.list());
    } catch {
      return null;
    }
  }

  private async extractMemoryFromTurn(input: {
    userMessage: PersistedMessage;
    assistantMessage: PersistedMessage;
  }): Promise<MemoryExtractionResult> {
    try {
      return await (
        this.memoryService ?? new MemoryService(this.memories)
      ).extractFromTurn(input);
    } catch {
      // Automatic memory extraction must never affect the completed chat turn.
      return { status: "fallback" };
    }
  }
}
