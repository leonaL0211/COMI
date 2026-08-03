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
  onClose?: () => void;
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
  onClose,
}: ConversationSidebarProps) {
  return (
    <aside className="conversation-sidebar">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Conversations
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="ui-button ui-button-primary min-h-10 px-4 text-xs disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)]"
            type="button"
            disabled={isCreating || isInteractionDisabled}
            onClick={onCreate}
          >
            {isCreating ? "Creating..." : "New"}
          </button>
          {onClose ? (
            <button
              className="mobile-sidebar-close"
              type="button"
              aria-label="关闭会话列表"
              onClick={onClose}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Loading conversations...
        </p>
      ) : conversations.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No conversations yet.
        </p>
      ) : (
        <ul className="conversation-list">
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

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </aside>
  );
}
