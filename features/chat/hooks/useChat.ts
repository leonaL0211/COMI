"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ConversationSummary,
  PersistedChatMessage,
  UiChatMessage,
} from "../types";

type ApiError = {
  error: string;
};

type ConversationsResponse = {
  conversations: ConversationSummary[];
};

type MessagesResponse = {
  messages: PersistedChatMessage[];
};

type CreateConversationResponse = {
  conversation: ConversationSummary;
};

type ChatResponse = {
  conversation: ConversationSummary;
  userMessage: PersistedChatMessage;
  assistantMessage: PersistedChatMessage;
};

const newConversationTitle = "新对话";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialConversation() {
      setIsLoadingHistory(true);
      setError(null);

      try {
        const conversations = await fetchJson<ConversationsResponse>(
          "/api/conversations",
        );
        const currentConversation = conversations.conversations[0];

        if (!currentConversation) {
          if (isMounted) {
            setConversationId(null);
            setMessages([]);
          }
          return;
        }

        const messageData = await fetchJson<MessagesResponse>(
          `/api/conversations/${currentConversation.id}/messages`,
        );

        if (isMounted) {
          setConversationId(currentConversation.id);
          setMessages(messageData.messages.map(toUiMessage));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError, "Failed to load conversation."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadInitialConversation();

    return () => {
      isMounted = false;
    };
  }, []);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending && !isLoadingHistory,
    [input, isLoadingHistory, isSending],
  );

  async function sendMessage() {
    const content = input.trim();

    if (!content || isSending || isLoadingHistory) {
      return;
    }

    const temporaryUserId = createId();
    const temporaryAssistantId = createId();
    let targetConversationId = conversationId;

    setMessages((current) => [
      ...current,
      {
        id: temporaryUserId,
        role: "user",
        content,
      },
      {
        id: temporaryAssistantId,
        role: "assistant",
        content: "Waiting for reply...",
        status: "pending",
      },
    ]);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      if (!targetConversationId) {
        const created = await createConversation();
        targetConversationId = created.id;
        setConversationId(created.id);
      }

      const result = await postChatMessage(targetConversationId, content);

      setConversationId(result.conversation.id);
      setMessages((current) =>
        current.map((message) => {
          if (message.id === temporaryUserId) {
            return toUiMessage(result.userMessage);
          }

          if (message.id === temporaryAssistantId) {
            return toUiMessage(result.assistantMessage);
          }

          return message;
        }),
      );
    } catch (sendError) {
      setMessages((current) =>
        current.filter((message) =>
          targetConversationId
            ? message.id !== temporaryAssistantId
            : message.id !== temporaryAssistantId &&
              message.id !== temporaryUserId,
        ),
      );
      setError(getErrorMessage(sendError, "Chat request failed."));

      if (targetConversationId) {
        await refreshMessages(targetConversationId);
      }
    } finally {
      setIsSending(false);
    }
  }

  async function refreshMessages(targetConversationId: string) {
    try {
      const messageData = await fetchJson<MessagesResponse>(
        `/api/conversations/${targetConversationId}/messages`,
      );

      setMessages(messageData.messages.map(toUiMessage));
    } catch {
      // Keep the optimistic user message visible if refresh fails.
    }
  }

  return {
    messages,
    input,
    setInput,
    isLoadingHistory,
    isSending,
    error,
    canSend,
    sendMessage,
  };
}

async function createConversation() {
  const data = await fetchJson<CreateConversationResponse>("/api/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: newConversationTitle }),
  });

  return data.conversation;
}

async function postChatMessage(conversationId: string, content: string) {
  return fetchJson<ChatResponse>("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      content,
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

function toUiMessage(message: PersistedChatMessage): UiChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    model: message.model,
    stopReason: message.stopReason ?? undefined,
    usage:
      message.inputTokens !== null || message.outputTokens !== null
        ? {
            inputTokens: message.inputTokens,
            outputTokens: message.outputTokens,
            totalTokens:
              message.inputTokens !== null && message.outputTokens !== null
                ? message.inputTokens + message.outputTokens
                : null,
          }
        : undefined,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
