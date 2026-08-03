"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_CHAT_MODEL,
  isChatModelKey,
  type ChatModelKey,
} from "@/shared/chat-models";

const modelPreferenceStorageKey = "berry-chat-v2-model";

export function useModelPreference() {
  const [selectedModel, setSelectedModelState] =
    useState<ChatModelKey>(DEFAULT_CHAT_MODEL);

  useEffect(() => {
    let isActive = true;

    queueMicrotask(() => {
      if (!isActive) {
        return;
      }

      try {
        const stored = window.localStorage.getItem(modelPreferenceStorageKey);

        if (isChatModelKey(stored)) {
          setSelectedModelState(stored);
        }
      } catch {
        // Keep the default model if localStorage is unavailable.
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const setSelectedModel = useCallback((model: ChatModelKey) => {
    setSelectedModelState(model);

    try {
      window.localStorage.setItem(modelPreferenceStorageKey, model);
    } catch {
      // The in-memory selection remains usable if localStorage is unavailable.
    }
  }, []);

  return {
    selectedModel,
    setSelectedModel,
  };
}
