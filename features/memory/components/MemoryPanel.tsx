"use client";

import { useState } from "react";
import { MemoryForm } from "./MemoryForm";
import { MemoryItem } from "./MemoryItem";
import { useMemories } from "../hooks/useMemories";
import { groupMemoriesForDisplay } from "../category-mapping";

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
    <div className="memory-backdrop sm:justify-end">
      <section className="memory-panel sm:max-w-xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              长期记忆
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
              长期记忆会在不同会话之间使用，你可以随时查看、修改或删除。
            </p>
          </div>
          <button className="ui-button ui-button-secondary" type="button" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              共 {memories.memories.length} 条记忆
            </p>
            <button
              className="ui-button ui-button-primary disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)]"
              type="button"
              disabled={memories.isSaving}
              onClick={() => setIsCreating(true)}
            >
              新增记忆
            </button>
          </div>

          {memories.error ? (
            <div className="flex items-start justify-between gap-3 rounded-[var(--radius-medium)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--danger)]">
              <span>{memories.error}</span>
              <button
                className="text-xs font-medium text-[var(--danger)]"
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
            <p className="text-sm text-[var(--muted-foreground)]">
              正在加载长期记忆...
            </p>
          ) : memories.memories.length === 0 ? (
            <div className="rounded-[var(--radius-medium)] border border-dashed border-[var(--border-strong)] p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                还没有保存长期记忆。
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                长期记忆会在不同会话之间使用，你可以手动添加第一条。
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {groupMemoriesForDisplay(memories.memories).map(
                ({ group, memories: groupMemories }) => (
                  <section key={group.id} className="flex flex-col gap-3">
                    <header>
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        {group.label}
                      </h3>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {group.description}
                      </p>
                    </header>
                    <ul className="flex flex-col gap-3">
                      {groupMemories.map((memory) => (
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
                  </section>
                ),
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
