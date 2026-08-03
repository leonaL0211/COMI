"use client";

import type { Ref } from "react";
import { Popover } from "@/features/ui/Popover";
import {
  CHAT_MODEL_OPTIONS,
  getChatModelLabel,
  type ChatModelKey,
} from "@/shared/chat-models";

type ChatHeaderProps = {
  title: string;
  headerRef: Ref<HTMLElement>;
  selectedModel: ChatModelKey;
  isModelSelectorDisabled: boolean;
  onSelectModel: (model: ChatModelKey) => void;
  onOpenSidebar: () => void;
  onOpenMemoryPanel: () => void;
};

export function ChatHeader({
  title,
  headerRef,
  selectedModel,
  isModelSelectorDisabled,
  onSelectModel,
  onOpenSidebar,
  onOpenMemoryPanel,
}: ChatHeaderProps) {
  return (
    <header ref={headerRef} className="chat-header">
      <div className="chat-header-inner">
        <button
          className="mobile-sidebar-trigger"
          type="button"
          aria-label="打开会话列表"
          onClick={onOpenSidebar}
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
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
        <div className="chat-header-title">
          <p className="chat-header-kicker">Berry Chat v2</p>
          <h1 className="truncate text-base font-semibold leading-6 text-[var(--foreground)]">
            {title}
          </h1>
        </div>
        <div className="chat-header-actions">
          <Popover
            ariaLabel="选择聊天模型"
            trigger={(triggerProps) => (
              <button
                {...triggerProps}
                className="model-selector-button"
                type="button"
                aria-label="选择聊天模型"
                aria-haspopup="menu"
                disabled={isModelSelectorDisabled}
              >
                <span>{getChatModelLabel(selectedModel)}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            )}
          >
            {CHAT_MODEL_OPTIONS.map((option) => (
              <button
                key={option.key}
                className="popover-menu-item model-menu-item"
                type="button"
                role="menuitemradio"
                aria-checked={option.key === selectedModel}
                onClick={() => onSelectModel(option.key)}
              >
                <span>{option.label}</span>
                {option.key === selectedModel ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="model-menu-check"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : null}
              </button>
            ))}
          </Popover>
          <button
            className="ui-button ui-button-secondary chat-memory-button min-h-10"
            type="button"
            onClick={onOpenMemoryPanel}
          >
            长期记忆
          </button>
        </div>
      </div>
    </header>
  );
}
