"use client";

import { useState } from "react";
import { Popover } from "@/features/ui/Popover";
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
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
        <Popover
          ariaLabel="记忆操作"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="ui-icon-button"
              type="button"
              aria-label={`打开 ${memory.title} 的操作菜单`}
              disabled={isBusy}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill="currentColor"
              >
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
          )}
        >
          <button
            className="popover-menu-item"
            type="button"
            role="menuitem"
            onClick={() => setIsEditing(true)}
          >
            编辑
          </button>
          <button
            className="popover-menu-item"
            type="button"
            role="menuitem"
            onClick={() => void onTogglePin(memory)}
          >
            {memory.isPinned ? "取消置顶" : "置顶"}
          </button>
          <button
            className="popover-menu-item popover-menu-item-danger"
            type="button"
            role="menuitem"
            onClick={() => void handleDelete()}
          >
            删除记忆
          </button>
        </Popover>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
        <span>{categoryLabels[memory.category]}</span>
        <span>重要度 {memory.importance} 级</span>
        <span className="memory-source-badge">
          {memory.source === "auto" ? "自动记住" : "手动添加"}
        </span>
        {isDeleting ? <span>删除中...</span> : null}
      </div>
    </li>
  );
}
