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
              关于我
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
              COMI 在持续对话中逐渐形成的关于你的理解，你可以随时查看、修改或删除。
            </p>
          </div>
          <button
            className="ui-icon-button about-me-close"
            type="button"
            aria-label="关闭关于我"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              {memories.memories.length > 0
                ? `已经记住 ${memories.memories.length} 件关于你的事`
                : "还没有记住任何事"}
            </p>
            <button
              className="ui-button ui-button-primary disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)]"
              type="button"
              disabled={memories.isSaving}
              onClick={() => setIsCreating(true)}
            >
              手动记一件事
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
              正在加载关于你的理解...
            </p>
          ) : memories.memories.length === 0 ? (
            <div className="about-me-empty-state">
              <p className="about-me-empty-title">我们还在慢慢认识。</p>
              <p className="about-me-empty-subtitle">
                和 COMI 多聊一会儿，值得记住的事情会逐渐出现在这里。你也可以手动记一件事。
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {groupMemoriesForDisplay(memories.memories).map(
                ({ group, memories: groupMemories }) => (
                  <section key={group.id} className="about-me-group">
                    <header className="about-me-group-header">
                      <h3 className="about-me-group-title">{group.label}</h3>
                      <p className="about-me-group-subtitle">
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
