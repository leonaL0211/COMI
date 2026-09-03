import type { ConversationSummary } from "@/features/conversations/types";
import type { ChatModelKey } from "@/shared/chat-models";
import type { MemoryExtractionStatus, PersistedChatMessage } from "./types";

type ApiError = {
  error: string;
};

type MessagesResponse = {
  messages: PersistedChatMessage[];
};

type ChatResponse = {
  conversation: ConversationSummary;
  userMessage: PersistedChatMessage;
  assistantMessage: PersistedChatMessage;
  memoryExtraction?: { status: MemoryExtractionStatus };
};

export async function listMessages(
  conversationId: string,
  signal?: AbortSignal,
) {
  const data = await fetchJson<MessagesResponse>(
    `/api/conversations/${conversationId}/messages`,
    { signal },
  );

  return data.messages;
}

export async function sendChatMessage(
  conversationId: string,
  content: string,
  model: ChatModelKey,
  clientMessageId: string,
  image?: { mimeType: string; data: string } | null,
) {
  return fetchJson<ChatResponse>("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      content,
      model,
      clientMessageId,
      ...(image ? { image } : {}),
    }),
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(isApiError(data) ? data.error : "Request failed.");
  }

  return data as T;
}

function isApiError(data: unknown): data is ApiError {
  return (
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as ApiError).error === "string"
  );
}
