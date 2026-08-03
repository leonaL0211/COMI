"use client";

import { useState } from "react";
import { MemoryForm } from "./MemoryForm";
import { MemoryItem } from "./MemoryItem";
import { useMemories } from "../hooks/useMemories";

type MemoryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MemoryPanel({ isOpen, onClose }: MemoryPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const memories = useMemories(isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950/30 p-3 sm:justify-end">
      <section className="flex max-h-full w-full flex-col overflow-hidden rounded border border-zinc-200 bg-white shadow-xl sm:max-w-xl">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">长期记忆</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              长期记忆会在不同会话之间使用，你可以随时查看、修改或删除。
            </p>
          </div>
          <button
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700"
            type="button"
            onClick={onClose}
          >
            关闭
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600">
              共 {memories.memories.length} 条记忆
            </p>
            <button
              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
              type="button"
              disabled={memories.isSaving}
              onClick={() => setIsCreating(true)}
            >
              新增记忆
            </button>
          </div>

          {memories.error ? (
            <div className="flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <span>{memories.error}</span>
              <button
                className="text-xs font-medium text-red-700"
                type="button"
                onClick={memories.dismissError}
              >
                关闭
              </button>
            </div>
          ) : null}

          {isCreating ? (
            <MemoryForm
              isSaving={memories.isSaving}
              onCancel={() => setIsCreating(false)}
              onSubmit={memories.create}
            />
          ) : null}

          {memories.isLoading ? (
            <p className="text-sm text-zinc-500">正在加载长期记忆...</p>
          ) : memories.memories.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-300 p-4">
              <p className="text-sm font-medium text-zinc-800">
                小草莓还没有保存长期记忆。
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                长期记忆会在不同会话之间使用，你可以手动添加第一条。
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {memories.memories.map((memory) => (
                <MemoryItem
                  key={memory.id}
                  memory={memory}
                  isSaving={memories.isSaving}
                  isDeleting={memories.deletingMemoryId === memory.id}
                  isActive={memories.activeMemoryId === memory.id}
                  onUpdate={memories.update}
                  onTogglePin={memories.togglePin}
                  onDelete={memories.delete}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

