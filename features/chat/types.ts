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
  model: string | null;
  stopReason: ChatStopReason | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
};
