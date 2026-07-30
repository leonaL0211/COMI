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
      className={`rounded border p-2 ${
        isCurrent
          ? "border-zinc-900 bg-zinc-100"
          : "border-zinc-200 bg-white"
      }`}
    >
      <button
        className="block w-full text-left text-sm font-medium text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-400"
        type="button"
        disabled={isDisabled}
        onClick={() => onSelect(conversation.id)}
      >
        {conversation.title}
      </button>
      <div className="mt-2 flex gap-2">
        <button
          className="text-xs text-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-400"
          type="button"
          disabled={isDisabled}
          onClick={() => onRename(conversation)}
        >
          Rename
        </button>
        <button
          className="text-xs text-red-600 disabled:cursor-not-allowed disabled:text-zinc-400"
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
