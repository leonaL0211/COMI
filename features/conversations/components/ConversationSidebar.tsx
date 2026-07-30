"use client";

import { ConversationItem } from "./ConversationItem";
import type { ConversationSummary } from "../types";

type ConversationSidebarProps = {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  isLoading: boolean;
  isCreating: boolean;
  isInteractionDisabled: boolean;
  error: string | null;
  onCreate: () => void;
  onSelect: (conversationId: string) => void;
  onRename: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
};

export function ConversationSidebar({
  conversations,
  currentConversationId,
  isLoading,
  isCreating,
  isInteractionDisabled,
  error,
  onCreate,
  onSelect,
  onRename,
  onDelete,
}: ConversationSidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-3 rounded border border-zinc-200 bg-white p-4 md:w-64">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">Conversations</h2>
        <button
          className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          type="button"
          disabled={isCreating || isInteractionDisabled}
          onClick={onCreate}
        >
          {isCreating ? "Creating..." : "New"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading conversations...</p>
      ) : conversations.length === 0 ? (
        <p className="text-sm text-zinc-500">No conversations yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isCurrent={conversation.id === currentConversationId}
              isDisabled={isInteractionDisabled}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </aside>
  );
}
