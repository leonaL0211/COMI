import type {
  ChatCompletionResult,
  ChatMessage,
  ChatStopReason,
  ChatUsage,
} from "@/shared/chat-types";

export type { ChatCompletionResult, ChatMessage, ChatStopReason, ChatUsage };

export type UiChatMessage = ChatMessage & {
  id: string;
  stopReason?: ChatStopReason;
  usage?: ChatUsage;
};
