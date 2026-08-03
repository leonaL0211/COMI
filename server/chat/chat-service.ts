import type { ChatCompletionResult, ChatMessage } from "@/shared/chat-types";
import type { ChatProvider } from "@/server/providers/chat-provider";
import { OriginRouterProvider } from "@/server/providers/originrouter-provider";
import { berryChatSystemPrompt } from "./system-prompt";

export class ChatService {
  constructor(private readonly provider: ChatProvider = new OriginRouterProvider()) {}

  async sendMessage(
    messages: ChatMessage[],
    options: { model?: string } = {},
  ): Promise<ChatCompletionResult> {
    return this.provider.createChatCompletion({
      messages: [
        {
          role: "system",
          content: berryChatSystemPrompt,
        },
        ...messages,
      ],
      model: options.model,
    });
  }
}
