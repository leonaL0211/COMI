"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConversation as createConversationRequest,
  deleteConversation as deleteConversationRequest,
  listConversations,
  renameConversation as renameConversationRequest,
} from "../api";
import type { ConversationSummary } from "../types";

const defaultTitle = "新对话";
const maxTitleLength = 160;

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createInFlightRef = useRef(false);
  const loadRequestIdRef = useRef(0);

  const refreshConversations = useCallback(
    async (options: { keepCurrent?: boolean } = {}) => {
      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      setError(null);

      try {
        const nextConversations = await listConversations();

        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        setConversations(nextConversations);
        setCurrentConversationId((current) => {
          if (
            options.keepCurrent &&
            current &&
            nextConversations.some((conversation) => conversation.id === current)
          ) {
            return current;
          }

          return null;
        });
      } catch (loadError) {
        if (loadRequestIdRef.current === requestId) {
          setError(getErrorMessage(loadError, "Failed to load conversations."));
        }
      } finally {
        if (loadRequestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void refreshConversations();
    });
  }, [refreshConversations]);

  const createConversation = useCallback(async () => {
    if (createInFlightRef.current) {
      return null;
    }

    createInFlightRef.current = true;
    setIsCreating(true);
    setError(null);

    try {
      const conversation = await createConversationRequest(defaultTitle);
      setConversations((current) => [conversation, ...current]);
      setCurrentConversationId(conversation.id);
      return conversation;
    } catch (createError) {
      setError(getErrorMessage(createError, "Failed to create conversation."));
      return null;
    } finally {
      createInFlightRef.current = false;
      setIsCreating(false);
    }
  }, []);

  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
  }, []);

  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setError(null);
  }, []);

  const renameConversation = useCallback(
    async (conversationId: string, nextTitle: string) => {
      const title = nextTitle.trim();

      if (!title || title.length > maxTitleLength) {
        setError(`Title must be 1 to ${maxTitleLength} characters.`);
        return false;
      }

      setError(null);

      try {
        const renamed = await renameConversationRequest(conversationId, title);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId ? renamed : conversation,
          ),
        );
        return true;
      } catch (renameError) {
        setError(getErrorMessage(renameError, "Failed to rename conversation."));
        return false;
      }
    },
    [],
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      setError(null);

      try {
        await deleteConversationRequest(conversationId);
        const remaining = conversations.filter(
          (conversation) => conversation.id !== conversationId,
        );

        setConversations(remaining);
        setCurrentConversationId((selected) =>
          selected === conversationId ? null : selected,
        );
        return true;
      } catch (deleteError) {
        setError(getErrorMessage(deleteError, "Failed to delete conversation."));
        return false;
      }
    },
    [conversations],
  );

  return {
    conversations,
    currentConversationId,
    isLoading,
    isCreating,
    error,
    refreshConversations,
    createConversation,
    startNewConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
