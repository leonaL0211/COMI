"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listMessages, sendChatMessage } from "../api";
import type { PersistedChatMessage, UiChatMessage } from "../types";
import type { ConversationSummary } from "@/features/conversations/types";
import {
  DEFAULT_CHAT_MODEL,
  type ChatModelKey,
} from "@/shared/chat-models";

type UseChatInput = {
  conversationId: string | null;
  ensureConversation: () => Promise<ConversationSummary | null>;
  onConversationChanged: () => Promise<void>;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useChat({
  conversationId,
  ensureConversation,
  onConversationChanged,
}: UseChatInput) {
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  const sendInFlightRef = useRef(false);
  const currentConversationIdRef = useRef<string | null>(conversationId);
  const retryDraftRef = useRef<{
    conversationId: string;
    model: ChatModelKey;
    clientMessageId: string;
  } | null>(null);

  useEffect(() => {
    currentConversationIdRef.current = conversationId;
    retryDraftRef.current = null;
  }, [conversationId]);

  const updateInput = useCallback((value: string) => {
    retryDraftRef.current = null;
    setInput(value);
  }, []);

  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    loadAbortRef.current?.abort();

    if (!conversationId) {
      queueMicrotask(() => {
        if (!currentConversationIdRef.current) {
          setMessages([]);
          setInput("");
          setError(null);
          setIsLoadingMessages(false);
        }
      });
      return;
    }

    if (sendInFlightRef.current) {
      return;
    }

    const targetConversationId = conversationId;
    const controller = new AbortController();
    loadAbortRef.current = controller;
    setIsLoadingMessages(true);
    setError(null);

    async function loadConversationMessages() {
      try {
        const nextMessages = await listMessages(
          targetConversationId,
          controller.signal,
        );

        if (
          loadRequestIdRef.current === requestId &&
          currentConversationIdRef.current === targetConversationId
        ) {
          setMessages(nextMessages.map(toUiMessage));
        }
      } catch (loadError) {
        if (
          controller.signal.aborted ||
          loadRequestIdRef.current !== requestId
        ) {
          return;
        }

        setError(getErrorMessage(loadError, "Failed to load messages."));
      } finally {
        if (
          loadRequestIdRef.current === requestId &&
          currentConversationIdRef.current === targetConversationId
        ) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadConversationMessages();

    return () => {
      controller.abort();
    };
  }, [conversationId]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending && !isLoadingMessages,
    [input, isLoadingMessages, isSending],
  );

  const refreshMessages = useCallback(async (targetConversationId: string) => {
    try {
      const nextMessages = await listMessages(targetConversationId);

      if (currentConversationIdRef.current === targetConversationId) {
        setMessages(nextMessages.map(toUiMessage));
      }
    } catch {
      // Keep the current visible state if this recovery refresh fails.
    }
  }, []);

  const sendMessage = useCallback(
    async (
      model: ChatModelKey = DEFAULT_CHAT_MODEL,
      contentOverride?: string,
    ) => {
      const isOverrideSend = typeof contentOverride === "string";
      const content = (contentOverride ?? input).trim();

      if (!content || sendInFlightRef.current || isLoadingMessages) {
        return;
      }

      sendInFlightRef.current = true;
      setIsSending(true);
      setError(null);

      let targetConversationId = currentConversationIdRef.current;
      const temporaryUserId = createId();
      const temporaryAssistantId = createId();
      const retryDraft =
        !isOverrideSend &&
        targetConversationId &&
        retryDraftRef.current?.conversationId === targetConversationId &&
        retryDraftRef.current.model === model
          ? retryDraftRef.current
          : null;
      const clientMessageId = retryDraft?.clientMessageId ?? createId();

      try {
        if (!targetConversationId) {
          const created = await ensureConversation();

          if (!created) {
            return;
          }

          targetConversationId = created.id;
          currentConversationIdRef.current = created.id;
        }

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
            // Stamp the model up front so avatar-visibility logic (which
            // compares consecutive assistant messages' models) sees the
            // correct value immediately, instead of "unknown" while pending
            // and then the real model once the response resolves — which
            // would otherwise flicker the avatar in and out.
            model,
          },
        ]);

        if (!isOverrideSend) {
          setInput("");
        }

        const result = await sendChatMessage(
          targetConversationId,
          content,
          model,
          clientMessageId,
        );

        retryDraftRef.current = null;

        if (currentConversationIdRef.current === targetConversationId) {
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
        }
      } catch (sendError) {
        if (targetConversationId) {
          retryDraftRef.current = {
            conversationId: targetConversationId,
            model,
            clientMessageId,
          };

          if (currentConversationIdRef.current === targetConversationId) {
            setMessages((current) =>
              current.filter((message) => message.id !== temporaryAssistantId),
            );
            setInput(content);
            await refreshMessages(targetConversationId);
          }
        }

        setError(getErrorMessage(sendError, "Chat request failed."));
      } finally {
        await onConversationChanged();
        sendInFlightRef.current = false;
        setIsSending(false);
      }
    },
    [
      ensureConversation,
      input,
      isLoadingMessages,
      onConversationChanged,
      refreshMessages,
    ],
  );

  return {
    messages,
    input,
    setInput: updateInput,
    isLoadingMessages,
    isSending,
    error,
    canSend,
    sendMessage,
  };
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
