import type {
  ChatCompletionResult,
  ChatMessage,
  ChatStopReason,
  ChatUsage,
} from "@/shared/chat-types";

export type { ChatCompletionResult, ChatMessage, ChatStopReason, ChatUsage };

export type UiChatMessage = ChatMessage & {
  id: string;
  createdAt?: string;
  model?: string | null;
  status?: "pending";
  stopReason?: ChatStopReason;
  usage?: ChatUsage;
};

export type PersistedChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  clientMessageId: string | null;
  model: string | null;
  stopReason: ChatStopReason | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
};

/**
 * Mirrors server MemoryExtractionResult["status"]. Kept as a local type
 * (rather than importing the server module) so this file stays a plain
 * client-safe type file.
 */
export type MemoryExtractionStatus = "created" | "updated" | "ignored" | "fallback";
