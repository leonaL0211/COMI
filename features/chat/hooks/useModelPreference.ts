"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CHAT_MODEL,
  isChatModelKey,
  type ChatModelKey,
} from "@/shared/chat-models";

// Global fallback: "what model did the user pick last, anywhere" — used
// for brand-new conversations and as the last resort if a conversation
// has no stored model of its own. No schema change: this whole feature
// stays client-side localStorage, same mechanism as before, just extended
// to also remember a per-conversation choice.
const globalModelPreferenceStorageKey = "berry-chat-v2-model";

function conversationModelStorageKey(conversationId: string) {
  return `berry-chat-v2-model:${conversationId}`;
}

function readStoredModel(key: string): ChatModelKey | null {
  try {
    const stored = window.localStorage.getItem(key);

    return isChatModelKey(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredModel(key: string, model: ChatModelKey) {
  try {
    window.localStorage.setItem(key, model);
  } catch {
    // The in-memory selection remains usable if localStorage is unavailable.
  }
}

/**
 * Model selection is per-conversation, restored from localStorage keyed by
 * conversation id. A conversation with no stored value yet (new
 * conversation, or an older conversation from before this feature existed)
 * falls back to the last model used anywhere, then to DEFAULT_CHAT_MODEL —
 * never to a stale model left over from whatever conversation was open
 * previously.
 */
export function useModelPreference(conversationId: string | null) {
  const [selectedModel, setSelectedModelState] =
    useState<ChatModelKey>(DEFAULT_CHAT_MODEL);
  const currentConversationIdRef = useRef<string | null>(conversationId);

  useEffect(() => {
    currentConversationIdRef.current = conversationId;
    let isActive = true;

    queueMicrotask(() => {
      if (!isActive) {
        return;
      }

      const stored = conversationId
        ? (readStoredModel(conversationModelStorageKey(conversationId)) ??
          readStoredModel(globalModelPreferenceStorageKey))
        : readStoredModel(globalModelPreferenceStorageKey);

      setSelectedModelState(stored ?? DEFAULT_CHAT_MODEL);
    });

    return () => {
      isActive = false;
    };
  }, [conversationId]);

  const setSelectedModel = useCallback(
    (model: ChatModelKey) => {
      setSelectedModelState(model);
      writeStoredModel(globalModelPreferenceStorageKey, model);

      if (conversationId) {
        writeStoredModel(conversationModelStorageKey(conversationId), model);
      }
    },
    [conversationId],
  );

  return {
    selectedModel,
    setSelectedModel,
  };
}
