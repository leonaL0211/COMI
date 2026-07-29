"use client";

import { useMemo, useState } from "react";
import type { ChatCompletionResult, ChatMessage, UiChatMessage } from "../types";

type ChatApiSuccess = ChatCompletionResult;

type ChatApiError = {
  error: string;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useChat() {
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending],
  );

  async function sendMessage() {
    const content = input.trim();

    if (!content || isSending) {
      return;
    }

    const userMessage: UiChatMessage = {
      id: createId(),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }): ChatMessage => ({
            role,
            content,
          })),
        }),
      });
      const data = (await response.json()) as ChatApiSuccess | ChatApiError;

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Chat request failed.");
      }

      if (!isChatApiSuccess(data)) {
        throw new Error("Chat response was not in the expected format.");
      }

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: data.text,
          stopReason: data.stopReason,
          usage: data.usage,
        },
      ]);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Chat request failed.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return {
    messages,
    input,
    setInput,
    isSending,
    error,
    canSend,
    sendMessage,
  };
}

function isChatApiSuccess(data: ChatApiSuccess | ChatApiError): data is ChatApiSuccess {
  return (
    "text" in data &&
    typeof data.text === "string" &&
    "stopReason" in data &&
    typeof data.stopReason === "string"
  );
}
