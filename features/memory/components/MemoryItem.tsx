"use client";

import { useState } from "react";
import { MemoryForm } from "./MemoryForm";
import type { Memory, MemoryFormInput, MemoryCategory } from "../types";

type MemoryItemProps = {
  memory: Memory;
  isSaving: boolean;
  isDeleting: boolean;
  isActive: boolean;
  onUpdate: (memoryId: string, input: MemoryFormInput) => Promise<boolean>;
  onTogglePin: (memory: Memory) => Promise<boolean>;
  onDelete: (memoryId: string) => Promise<boolean>;
};

const categoryLabels: Record<MemoryCategory, string> = {
  general: "一般",
  preference: "偏好",
  person: "人物与关系",
  project: "项目与目标",
  health: "健康与限制",
  routine: "习惯与日常",
  other: "其他",
};

export function MemoryItem({
  memory,
  isSaving,
  isDeleting,
  isActive,
  onUpdate,
  onTogglePin,
  onDelete,
}: MemoryItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isBusy = isSaving || isDeleting || isActive;

  async function handleDelete() {
    const confirmed = window.confirm(
      "确定删除这条长期记忆吗？删除后，Berry Chat 不会再从记忆库中读取它。",
    );

    if (!confirmed) {
      return;
    }

    await onDelete(memory.id);
  }

  if (isEditing) {
    return (
      <li>
        <MemoryForm
          memory={memory}
          isSaving={isSaving && isActive}
          onCancel={() => setIsEditing(false)}
          onSubmit={async (input) => {
            const saved = await onUpdate(memory.id, input);
            if (saved) {
              setIsEditing(false);
            }
            return saved;
          }}
        />
      </li>
    );
  }

  return (
    <li className="memory-card p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {memory.title}
            </h3>
            {memory.isPinned ? (
              <span className="rounded-[var(--radius-pill)] bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--accent-foreground)]">
                已置顶
              </span>
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--foreground)]">
            {memory.content}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
        <span>{categoryLabels[memory.category]}</span>
        <span>重要度 {memory.importance} 级</span>
        <span>{memory.source === "auto" ? "自动记住" : "手动添加"}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--accent)] disabled:text-[var(--muted-foreground)]"
          type="button"
          disabled={isBusy}
          onClick={() => void onTogglePin(memory)}
        >
          {memory.isPinned ? "取消置顶" : "置顶"}
        </button>
        <button
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--accent)] disabled:text-[var(--muted-foreground)]"
          type="button"
          disabled={isBusy}
          onClick={() => setIsEditing(true)}
        >
          编辑
        </button>
        <button
          className="text-xs text-[var(--danger)] disabled:text-[var(--muted-foreground)]"
          type="button"
          disabled={isBusy}
          onClick={() => void handleDelete()}
        >
          {isDeleting ? "删除中..." : "删除"}
        </button>
      </div>
    </li>
  );
}
