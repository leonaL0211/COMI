"use client";

import type { ConversationSummary } from "../types";

type ConversationItemProps = {
  conversation: ConversationSummary;
  isCurrent: boolean;
  isDisabled: boolean;
  onSelect: (conversationId: string) => void;
  onRename: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
};

export function ConversationItem({
  conversation,
  isCurrent,
  isDisabled,
  onSelect,
  onRename,
  onDelete,
}: ConversationItemProps) {
  return (
    <li
      className={[
        "conversation-item",
        isCurrent ? "conversation-item-current" : "",
      ].join(" ")}
    >
      <button
        className="block w-full truncate text-left text-sm font-medium text-[var(--foreground)] disabled:text-[var(--muted-foreground)]"
        type="button"
        disabled={isDisabled}
        onClick={() => onSelect(conversation.id)}
      >
        {conversation.title}
      </button>
      <div className="mt-2 flex gap-2">
        <button
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--accent)] disabled:text-[var(--muted-foreground)]"
          type="button"
          disabled={isDisabled}
          onClick={() => onRename(conversation)}
        >
          Rename
        </button>
        <button
          className="text-xs text-[var(--danger)] disabled:text-[var(--muted-foreground)]"
          type="button"
          disabled={isDisabled}
          onClick={() => onDelete(conversation)}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
