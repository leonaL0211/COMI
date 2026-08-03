import type {
  ChatCompletionResult,
  ChatStopReason,
  ChatUsage,
} from "@/shared/chat-types";
import { ChatProviderError } from "./chat-provider";

export async function parseOriginRouterResponse(
  response: Response,
): Promise<ChatCompletionResult> {
  const data = await readJson(response);

  if (!response.ok) {
    throw new ChatProviderError(
      `AI service returned HTTP ${response.status}.`,
      response.status,
    );
  }

  const text = extractText(data);

  if (!text.trim()) {
    throw new ChatProviderError("AI service returned an empty response.");
  }

  return {
    text,
    model: getString(data.model),
    stopReason: mapStopReason(data),
    usage: extractUsage(data),
  };
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new ChatProviderError(
      response.ok
        ? "AI service returned invalid JSON."
        : "AI service returned a non-JSON error response.",
      response.ok ? 502 : response.status,
    );
  }
}

function extractText(data: Record<string, unknown>) {
  const choice = getFirstChoice(data);
  const message = choice?.message;

  if (message && typeof message === "object") {
    const content = (message as Record<string, unknown>).content;
    if (typeof content === "string") {
      return content;
    }
  }

  return "";
}

function mapStopReason(data: Record<string, unknown>): ChatStopReason {
  const finishReason = getString(getFirstChoice(data)?.finish_reason);
  const stopReason =
    getString(data.stop_reason) ??
    getString(getFirstChoice(data)?.stop_reason) ??
    getMessageStopReason(data);
  const normalized = (stopReason ?? finishReason ?? "").toLowerCase();

  if (normalized === "stop" || normalized === "end_turn") {
    return "end_turn";
  }

  if (
    normalized === "length" ||
    normalized === "max_tokens" ||
    normalized === "max_output_tokens" ||
    normalized === "token_limit" ||
    normalized === "output_token_limit"
  ) {
    return "max_tokens";
  }

  return "unknown";
}

function getFirstChoice(data: Record<string, unknown>) {
  return Array.isArray(data.choices)
    ? (data.choices[0] as Record<string, unknown> | undefined)
    : undefined;
}

function getMessageStopReason(data: Record<string, unknown>) {
  const message = getFirstChoice(data)?.message;

  return message && typeof message === "object"
    ? getString((message as Record<string, unknown>).stop_reason)
    : null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function extractUsage(data: Record<string, unknown>): ChatUsage | undefined {
  const usage =
    data.usage && typeof data.usage === "object"
      ? (data.usage as Record<string, unknown>)
      : undefined;

  if (!usage) {
    return undefined;
  }

  const inputTokens =
    getNumber(usage.prompt_tokens) ?? getNumber(usage.input_tokens);
  const outputTokens =
    getNumber(usage.completion_tokens) ?? getNumber(usage.output_tokens);
  const totalTokens =
    getNumber(usage.total_tokens) ??
    (inputTokens !== null && outputTokens !== null
      ? inputTokens + outputTokens
      : null);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
