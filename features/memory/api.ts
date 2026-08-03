import type { Memory, MemoryFormInput, MemoryUpdateInput } from "./types";

type ApiError = {
  error: string;
};

type MemoriesResponse = {
  memories: Memory[];
};

type MemoryResponse = {
  memory: Memory;
};

export async function listMemories(signal?: AbortSignal) {
  const data = await fetchJson<MemoriesResponse>("/api/memories", {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });

  return data.memories;
}

export async function createMemory(input: MemoryFormInput) {
  const data = await fetchJson<MemoryResponse>("/api/memories", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return data.memory;
}

export async function updateMemory(
  memoryId: string,
  input: MemoryUpdateInput,
) {
  const data = await fetchJson<MemoryResponse>(`/api/memories/${memoryId}`, {
    method: "PATCH",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return data.memory;
}

export async function deleteMemory(memoryId: string) {
  await fetchJson<{ deleted: true }>(`/api/memories/${memoryId}`, {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("记忆请求失败，请稍后再试。");
  }

  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(isApiError(data) ? data.error : "记忆请求失败，请稍后再试。");
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

