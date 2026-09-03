import { ChatService } from "@/server/chat/chat-service";
import { buildMemoryContextMessage } from "@/server/memory/memory-context-builder";
import { MemoryService } from "@/server/memory/memory-service";
import { ChatProviderError } from "@/server/providers/chat-provider";
import { SupabaseConversationRepository } from "@/server/repositories/supabase-conversation-repository";
import { SupabaseMemoryRepository } from "@/server/repositories/supabase-memory-repository";
import { SupabaseMessageRepository } from "@/server/repositories/supabase-message-repository";
import { buildChatContext } from "@/server/summary/context-builder";
import { SummaryService } from "@/server/summary/summary-service";
import {
  deleteImage,
  uploadImage,
  ImageStorageError,
} from "@/server/attachments/image-storage";
import {
  processUploadedImage,
  ImageProcessingError,
} from "@/server/attachments/image-processing";
import {
  createImageToken,
  stripImageToken,
} from "@/shared/attachments/image-catalog";
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
import type { ChatProviderImageInput } from "@/server/providers/chat-provider";
import type { ChatModelKey } from "@/shared/chat-models";
import type { MemoryExtractionResult } from "@/server/memory/memory-types";

export type PersistentChatImageInput = {
  mimeType: string;
  /** Raw base64, no `data:` prefix. */
  data: string;
};

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
    private readonly ownerId: string,
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
    image?: PersistentChatImageInput;
  }): Promise<PersistentChatResult> {
    const existingConversation = await this.conversations.findById(
      input.conversationId,
    );

    if (!existingConversation) {
      throw new PersistentChatServiceError("Conversation not found.", 404);
    }

    if (!input.content.trim() && !input.image) {
      throw new PersistentChatServiceError("content cannot be empty.", 400);
    }

    const uploadedImage = input.image
      ? await this.uploadTurnImage(input.conversationId, input.image)
      : null;
    const finalContent = uploadedImage
      ? [createImageToken(uploadedImage.storageKey), input.content.trim()]
          .filter(Boolean)
          .join(" ")
      : input.content;

    let userMessage: PersistedMessage;

    try {
      userMessage = await this.messages.createUserMessage({
        conversationId: input.conversationId,
        content: finalContent,
        clientMessageId: input.clientMessageId ?? null,
      });
    } catch (error) {
      // The message row never made it into the DB — don't leave the
      // upload orphaned in Storage with nothing referencing it.
      if (uploadedImage) {
        await deleteImage(uploadedImage.storageKey);
      }

      throw error;
    }

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

    // context-builder.ts already reduced every message — including this
    // one — to a safe, text-only description. Only now, for this one
    // live request, do we swap the current turn's entry back to the
    // user's actual caption and hand the real image bytes to the
    // provider layer separately. Older turns are never touched: their
    // images are never re-sent, only ChatContext's neutral placeholder
    // text about them survives into later turns.
    let providerImage: ChatProviderImageInput | undefined;

    if (uploadedImage && chatContext.length > 0) {
      const lastIndex = chatContext.length - 1;
      chatContext[lastIndex] = {
        ...chatContext[lastIndex],
        content: stripImageToken(finalContent) || "（用户发送了一张图片，没有附加文字）",
      };
      providerImage = {
        mimeType: uploadedImage.mimeType,
        base64: uploadedImage.buffer.toString("base64"),
      };
    }

    const memoryContextMessage = await this.loadMemoryContextMessage();
    const completion = await this.createCompletion(
      [...(memoryContextMessage ? [memoryContextMessage] : []), ...chatContext],
      resolveChatProviderModelId(input.model),
      providerImage,
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

  private async uploadTurnImage(
    conversationId: string,
    image: PersistentChatImageInput,
  ) {
    let raw: Buffer;

    try {
      raw = Buffer.from(image.data, "base64");
    } catch {
      throw new PersistentChatServiceError("Image data is not valid base64.", 400);
    }

    try {
      const processed = await processUploadedImage(raw, image.mimeType);
      const storageKey = await uploadImage({
        ownerId: this.ownerId,
        conversationId,
        buffer: processed.buffer,
      });

      return {
        storageKey,
        buffer: processed.buffer,
        mimeType: processed.mimeType,
      };
    } catch (error) {
      if (error instanceof ImageProcessingError) {
        throw new PersistentChatServiceError(error.message, error.status);
      }

      if (error instanceof ImageStorageError) {
        throw new PersistentChatServiceError(
          "Image upload failed. Please try again.",
          error.status,
        );
      }

      throw error;
    }
  }

  private async createCompletion(
    messages: ChatMessage[],
    model: string,
    image?: ChatProviderImageInput,
  ) {
    try {
      return await (this.chatService ?? new ChatService()).sendMessage(
        messages,
        { model, image },
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
