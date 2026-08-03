"use client";

import { FormEvent, useState } from "react";
import {
  memoryCategories,
  type Memory,
  type MemoryCategory,
  type MemoryFormInput,
  type MemoryImportance,
} from "../types";

type MemoryFormProps = {
  memory?: Memory;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: MemoryFormInput) => Promise<boolean>;
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

export function MemoryForm({
  memory,
  isSaving,
  onCancel,
  onSubmit,
}: MemoryFormProps) {
  const [title, setTitle] = useState(memory?.title ?? "");
  const [content, setContent] = useState(memory?.content ?? "");
  const [category, setCategory] = useState<MemoryCategory>(
    memory?.category ?? "general",
  );
  const [importance, setImportance] = useState<MemoryImportance>(
    memory?.importance ?? 3,
  );
  const [isPinned, setIsPinned] = useState(memory?.isPinned ?? false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateForm({
      title,
      content,
      category,
      importance,
      isPinned,
    });

    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setError(null);

    const saved = await onSubmit(validation.input);

    if (saved) {
      onCancel();
    }
  }

  return (
    <form className="memory-card flex flex-col gap-3 p-3" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted-foreground)]" htmlFor="memory-title">
          标题
        </label>
        <input
          id="memory-title"
          className="rounded-[var(--radius-small)] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium text-[var(--muted-foreground)]"
          htmlFor="memory-content"
        >
          正文
        </label>
        <textarea
          id="memory-content"
          className="min-h-28 resize-y rounded-[var(--radius-small)] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm leading-6 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-medium text-[var(--muted-foreground)]"
            htmlFor="memory-category"
          >
            分类
          </label>
          <select
            id="memory-category"
            className="rounded-[var(--radius-small)] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            value={category}
            onChange={(event) => setCategory(event.target.value as MemoryCategory)}
            disabled={isSaving}
          >
            {memoryCategories.map((value) => (
              <option key={value} value={value}>
                {categoryLabels[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-medium text-[var(--muted-foreground)]"
            htmlFor="memory-importance"
          >
            重要度
          </label>
          <select
            id="memory-importance"
            className="rounded-[var(--radius-small)] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            value={importance}
            onChange={(event) =>
              setImportance(Number(event.target.value) as MemoryImportance)
            }
            disabled={isSaving}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} 级
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(event) => setIsPinned(event.target.checked)}
          disabled={isSaving}
        />
        置顶这条记忆
      </label>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <button
          className="ui-button ui-button-secondary disabled:text-[var(--muted-foreground)]"
          type="button"
          onClick={onCancel}
          disabled={isSaving}
        >
          取消
        </button>
        <button
          className="ui-button ui-button-primary disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)]"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}

function validateForm(input: MemoryFormInput):
  | {
      ok: true;
      input: MemoryFormInput;
    }
  | {
      ok: false;
      error: string;
    } {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title || title.length > 160) {
    return { ok: false, error: "标题需要是 1 到 160 个字符。" };
  }

  if (!content || content.length > 2000) {
    return { ok: false, error: "正文需要是 1 到 2000 个字符。" };
  }

  if (!memoryCategories.includes(input.category)) {
    return { ok: false, error: "请选择有效分类。" };
  }

  if (
    !Number.isInteger(input.importance) ||
    input.importance < 1 ||
    input.importance > 5
  ) {
    return { ok: false, error: "重要度需要是 1 到 5。" };
  }

  return {
    ok: true,
    input: {
      title,
      content,
      category: input.category,
      importance: input.importance,
      isPinned: input.isPinned,
    },
  };
}
