import type { ChatMessage } from "@/shared/chat-types";
import type { ChatProvider, ChatProviderRequest } from "./chat-provider";
import { ChatProviderError } from "./chat-provider";
import {
  getOriginRouterConfig,
  type OriginRouterConfig,
} from "./originrouter-config";
import { parseOriginRouterResponse } from "./originrouter-response";

type OriginRouterMessage = {
  role: ChatMessage["role"];
  content: string;
};

export class OriginRouterProvider implements ChatProvider {
  private readonly config: OriginRouterConfig;

  constructor(config = getOriginRouterConfig()) {
    this.config = config;
  }

  async createChatCompletion({
    maxOutputTokens,
    messages,
    model,
  }: ChatProviderRequest) {
    let response: Response;
    const requestModel = model ?? this.config.model;

    try {
      response = await fetch(getChatCompletionsUrl(this.config.baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: requestModel,
          messages: messages.map(toOriginRouterMessage),
          max_tokens: maxOutputTokens ?? this.config.maxOutputTokens,
          stream: false,
        }),
      });
    } catch {
      throw new ChatProviderError("AI service request failed.", 502);
    }

    const result = await parseOriginRouterResponse(response);

    return {
      ...result,
      model: result.model ?? requestModel,
    };
  }
}

function getChatCompletionsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function toOriginRouterMessage(message: ChatMessage): OriginRouterMessage {
  return {
    role: message.role,
    content: message.content,
  };
}
