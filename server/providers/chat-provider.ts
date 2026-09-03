import type { ChatCompletionResult, ChatMessage } from "@/shared/chat-types";

/**
 * Raw bytes for the CURRENT turn's image only — see
 * OriginRouterProvider.createChatCompletion for how this gets attached to
 * just the last message's content as an OpenAI-style content-parts array.
 * Older turns never carry one of these; their image tokens have already
 * been rewritten to plain text by context-builder.ts before `messages`
 * ever reaches this layer. This keeps ChatMessage.content a plain string
 * everywhere except this one adapter-boundary field.
 */
export type ChatProviderImageInput = {
  mimeType: string;
  base64: string;
};

export type ChatProviderRequest = {
  messages: ChatMessage[];
  maxOutputTokens?: number;
  model?: string;
  image?: ChatProviderImageInput;
};

export interface ChatProvider {
  createChatCompletion(
    request: ChatProviderRequest,
  ): Promise<ChatCompletionResult>;
}

export class ChatProviderError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "ChatProviderError";
  }
}
