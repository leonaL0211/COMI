"use client";

import { Popover } from "@/features/ui/Popover";
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
        className="conversation-title-button"
        type="button"
        disabled={isDisabled}
        onClick={() => onSelect(conversation.id)}
      >
        {conversation.title}
      </button>
      <Popover
        ariaLabel="会话操作"
        trigger={(triggerProps) => (
          <button
            {...triggerProps}
            className="ui-icon-button"
            type="button"
            aria-label={`打开 ${conversation.title} 的操作菜单`}
            disabled={isDisabled}
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
          onClick={() => onRename(conversation)}
        >
          重命名
        </button>
        <button
          className="popover-menu-item popover-menu-item-danger"
          type="button"
          role="menuitem"
          onClick={() => onDelete(conversation)}
        >
          删除会话
        </button>
      </Popover>
    </li>
  );
}
