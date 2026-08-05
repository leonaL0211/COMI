"use client";

import { useEffect, useState } from "react";
import type { Ref } from "react";
import { Popover } from "@/features/ui/Popover";
import {
  CHAT_MODEL_OPTIONS,
  getChatModelLabel,
  type ChatModelKey,
} from "@/shared/chat-models";
import { themeOptions, type ThemeId } from "@/shared/themes";

type ChatHeaderProps = {
  title: string;
  headerRef: Ref<HTMLElement>;
  selectedModel: ChatModelKey;
  selectedTheme: ThemeId;
  isModelSelectorDisabled: boolean;
  onSelectModel: (model: ChatModelKey) => void;
  onSelectTheme: (theme: ThemeId) => void;
  onOpenSidebar: () => void;
  onOpenMemoryPanel: () => void;
};

export function ChatHeader({
  title,
  headerRef,
  selectedModel,
  selectedTheme,
  isModelSelectorDisabled,
  onSelectModel,
  onSelectTheme,
  onOpenSidebar,
  onOpenMemoryPanel,
}: ChatHeaderProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const modelId =
    selectedModel === "opus" ? "claude-opus-4-6" : "claude-sonnet-4-6";

  useEffect(() => {
    if (!isMoreMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMoreMenuOpen]);

  function openMemoryPanel() {
    setIsMoreMenuOpen(false);
    onOpenMemoryPanel();
  }

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
                <img src="/model-avatars/claude.png" alt="" />
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
          aria-label="打开更多菜单"
          aria-haspopup="dialog"
          aria-expanded={isMoreMenuOpen}
          onClick={() => setIsMoreMenuOpen(true)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>
      {isMoreMenuOpen ? (
        <div
          className="more-menu-backdrop"
          role="presentation"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <section
            className="more-menu-panel"
            role="dialog"
            aria-label="更多菜单"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="more-menu-handle" aria-hidden="true" />
            <div className="more-menu-heading">
              <p className="more-menu-title">更多</p>
              <button
                className="more-menu-close"
                type="button"
                aria-label="关闭更多菜单"
                onClick={() => setIsMoreMenuOpen(false)}
              >
                关闭
              </button>
            </div>
            <button
              className="more-menu-memory-item"
              type="button"
              onClick={openMemoryPanel}
            >
              <span>
                <span className="more-menu-item-title">长期记忆</span>
                <span className="more-menu-item-subtitle">
                  查看和管理 Berry 记住的内容
                </span>
              </span>
              <span className="more-menu-item-arrow" aria-hidden="true">
                ›
              </span>
            </button>
            <div className="more-menu-theme-section">
              <p className="more-menu-section-title">主题外观</p>
              <div className="theme-card-grid">
                {themeOptions.map((theme) => {
                  const isSelected = theme.id === selectedTheme;

                  return (
                    <button
                      key={theme.id}
                      className={[
                        "theme-choice-card",
                        isSelected ? "theme-choice-card-selected" : "",
                      ].join(" ")}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelectTheme(theme.id)}
                    >
                      <span className="theme-choice-preview" aria-hidden="true">
                        {theme.colors.slice(0, 3).map((color) => (
                          <span
                            key={color}
                            style={{ background: color }}
                          />
                        ))}
                      </span>
                      <span className="theme-choice-name">{theme.name}</span>
                      {isSelected ? (
                        <span className="theme-choice-check" aria-hidden="true">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </header>
  );
}
