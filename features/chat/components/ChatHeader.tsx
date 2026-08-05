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
  const modelId =
    selectedModel === "opus" ? "claude-opus-4-6" : "claude-sonnet-4-6";

  return (
    <header ref={headerRef} className="chat-header">
      <div className="chat-topbar-fade" aria-hidden="true" />
      <div className="chat-header-inner chat-topbar-content">
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
            <path d="M4 9h16" />
            <path d="M4 15h12" />
          </svg>
        </button>
        <Popover
          ariaLabel="选择聊天模型"
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              className="model-selector-button"
              type="button"
              aria-label={`选择聊天模型，当前会话：${title}`}
              aria-haspopup="menu"
              disabled={isModelSelectorDisabled}
            >
              <span className="model-avatar" aria-hidden="true">
                AI
              </span>
              <span className="model-selector-copy">
                <span className="model-selector-title">
                  {getChatModelLabel(selectedModel)}
                </span>
                <span className="model-selector-subtitle">{modelId}</span>
              </span>
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
          className="chat-memory-button"
          type="button"
          aria-label="打开长期记忆"
          onClick={onOpenMemoryPanel}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
