"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMemory as createMemoryRequest,
  deleteMemory as deleteMemoryRequest,
  listMemories,
  updateMemory as updateMemoryRequest,
} from "../api";
import type { Memory, MemoryFormInput, MemoryUpdateInput } from "../types";

export function useMemories(isOpen: boolean) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadAbortRef.current?.abort();
    };
  }, []);

  const load = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    loadAbortRef.current?.abort();

    const controller = new AbortController();
    loadAbortRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const nextMemories = await listMemories(controller.signal);

      if (mountedRef.current && loadRequestIdRef.current === requestId) {
        setMemories(nextMemories);
      }
    } catch (loadError) {
      if (
        mountedRef.current &&
        loadRequestIdRef.current === requestId &&
        !controller.signal.aborted
      ) {
        setError(getErrorMessage(loadError, "记忆加载失败，请稍后再试。"));
      }
    } finally {
      if (mountedRef.current && loadRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        void load();
      });
    }
  }, [isOpen, load]);

  const create = useCallback(async (input: MemoryFormInput) => {
    if (isSaving) {
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      const memory = await createMemoryRequest(input);

      if (mountedRef.current) {
        setMemories((current) => sortMemories([memory, ...current]));
      }

      return true;
    } catch (createError) {
      if (mountedRef.current) {
        setError(getErrorMessage(createError, "记忆保存失败，请稍后再试。"));
      }

      return false;
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [isSaving]);

  const update = useCallback(
    async (memoryId: string, input: MemoryUpdateInput) => {
      if (isSaving || activeMemoryId === memoryId) {
        return false;
      }

      setIsSaving(true);
      setActiveMemoryId(memoryId);
      setError(null);

      try {
        const memory = await updateMemoryRequest(memoryId, input);

        if (mountedRef.current) {
          setMemories((current) =>
            sortMemories(
              current.map((item) => (item.id === memoryId ? memory : item)),
            ),
          );
        }

        return true;
      } catch (updateError) {
        if (mountedRef.current) {
          setError(getErrorMessage(updateError, "记忆更新失败，请稍后再试。"));
        }

        return false;
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
          setActiveMemoryId(null);
        }
      }
    },
    [activeMemoryId, isSaving],
  );

  const togglePin = useCallback(
    (memory: Memory) => update(memory.id, { isPinned: !memory.isPinned }),
    [update],
  );

  const remove = useCallback(
    async (memoryId: string) => {
      if (deletingMemoryId === memoryId || activeMemoryId === memoryId) {
        return false;
      }

      setDeletingMemoryId(memoryId);
      setError(null);

      try {
        await deleteMemoryRequest(memoryId);

        if (mountedRef.current) {
          setMemories((current) =>
            current.filter((memory) => memory.id !== memoryId),
          );
        }

        return true;
      } catch (deleteError) {
        if (mountedRef.current) {
          setError(getErrorMessage(deleteError, "记忆删除失败，请稍后再试。"));
        }

        return false;
      } finally {
        if (mountedRef.current) {
          setDeletingMemoryId(null);
        }
      }
    },
    [activeMemoryId, deletingMemoryId],
  );

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    memories,
    isLoading,
    isSaving,
    deletingMemoryId,
    activeMemoryId,
    error,
    load,
    create,
    update,
    togglePin,
    delete: remove,
    dismissError,
  };
}

function sortMemories(memories: Memory[]) {
  return memories.slice().sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    if (left.importance !== right.importance) {
      return right.importance - left.importance;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
