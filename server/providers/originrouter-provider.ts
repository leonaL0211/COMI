import type { ChatMessage } from "@/shared/chat-types";
import type {
  ChatProvider,
  ChatProviderImageInput,
  ChatProviderRequest,
} from "./chat-provider";
import { ChatProviderError } from "./chat-provider";
import {
  getOriginRouterConfig,
  type OriginRouterConfig,
} from "./originrouter-config";
import { parseOriginRouterResponse } from "./originrouter-response";

type OriginRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type OriginRouterMessage = {
  role: ChatMessage["role"];
  content: string | OriginRouterContentPart[];
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
    image,
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
          messages: toOriginRouterMessages(messages, image),
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

/**
 * The multimodal content-parts shape is built ONLY here, and ONLY for the
 * last message in the array (the current turn) when an image was passed
 * in for this request. Every other message — and every request without an
 * image — stays a plain string, exactly as before. See
 * ChatProviderImageInput's doc comment for why: older-turn image tokens
 * have already been reduced to plain descriptive text upstream, so this
 * function never needs to know "was there an image N turns ago."
 *
 * Verified against the project's actual OriginRouter endpoint (capability
 * test, not just assumed from OpenAI docs): `image_url.url` must be a
 * `data:` URI — a remote http(s) URL is silently not received by the
 * model on this endpoint.
 */
function toOriginRouterMessages(
  messages: ChatMessage[],
  image?: ChatProviderImageInput,
): OriginRouterMessage[] {
  if (!image || messages.length === 0) {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  const lastIndex = messages.length - 1;

  return messages.map((message, index) => {
    if (index !== lastIndex) {
      return { role: message.role, content: message.content };
    }

    const parts: OriginRouterContentPart[] = [];

    if (message.content) {
      parts.push({ type: "text", text: message.content });
    }

    parts.push({
      type: "image_url",
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
    });

    return { role: message.role, content: parts };
  });
}
