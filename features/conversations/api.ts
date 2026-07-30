import type { ConversationSummary } from "./types";

type ApiError = {
  error: string;
};

type ConversationsResponse = {
  conversations: ConversationSummary[];
};

type ConversationResponse = {
  conversation: ConversationSummary;
};

const defaultTitle = "新对话";

export async function listConversations(signal?: AbortSignal) {
  const data = await fetchJson<ConversationsResponse>("/api/conversations", {
    signal,
  });

  return data.conversations;
}

export async function createConversation(title = defaultTitle) {
  const data = await fetchJson<ConversationResponse>("/api/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  return data.conversation;
}

export async function renameConversation(conversationId: string, title: string) {
  const data = await fetchJson<ConversationResponse>(
    `/api/conversations/${conversationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    },
  );

  return data.conversation;
}

export async function deleteConversation(conversationId: string) {
  await fetchJson<{ ok: true }>(`/api/conversations/${conversationId}`, {
    method: "DELETE",
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
