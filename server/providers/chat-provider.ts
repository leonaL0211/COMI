import type { ChatCompletionResult, ChatMessage } from "@/shared/chat-types";

export type ChatProviderRequest = {
  messages: ChatMessage[];
  maxOutputTokens?: number;
  model?: string;
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
