import { ChatProviderError } from "./chat-provider";
import { resolveDefaultChatProviderModelId } from "./chat-model-resolver";

export type OriginRouterConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxOutputTokens: number;
};

const defaultBaseUrl = "https://api.originrouter.com/v1";
const defaultMaxOutputTokens = 8192;

export function getOriginRouterConfig(): OriginRouterConfig {
  const apiKey = process.env.CLAUDE_API_KEY ?? process.env.ORIGINROUTER_API_KEY;

  if (!apiKey) {
    throw new ChatProviderError(
      "Missing server environment variable: CLAUDE_API_KEY.",
      500,
    );
  }

  return {
    apiKey,
    baseUrl:
      process.env.CLAUDE_API_BASE_URL ??
      process.env.ORIGINROUTER_API_BASE_URL ??
      defaultBaseUrl,
    model: resolveDefaultChatProviderModelId(),
    maxOutputTokens: readMaxOutputTokens(),
  };
}

function readMaxOutputTokens() {
  const raw =
    process.env.CLAUDE_MAX_OUTPUT_TOKENS ??
    process.env.ORIGINROUTER_MAX_OUTPUT_TOKENS;
  const value = raw ? Number(raw) : defaultMaxOutputTokens;

  if (!Number.isInteger(value) || value < 1) {
    throw new ChatProviderError(
      "CLAUDE_MAX_OUTPUT_TOKENS must be a positive integer.",
      500,
    );
  }

  return value;
}
