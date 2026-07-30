import type { ChatStopReason } from "@/shared/chat-types";

export type PersistedMessage = {
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

export interface MessageRepository {
  listByConversation(conversationId: string): Promise<PersistedMessage[]>;
  createUserMessage(input: {
    conversationId: string;
    content: string;
  }): Promise<PersistedMessage>;
  createAssistantMessage(input: {
    conversationId: string;
    content: string;
    model?: string | null;
    stopReason?: ChatStopReason | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
  }): Promise<PersistedMessage>;
}
