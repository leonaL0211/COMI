"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, Ref } from "react";
import { Popover } from "@/features/ui/Popover";
import { StickerPicker } from "@/features/stickers/StickerPicker";
import {
  CHAT_MODEL_OPTIONS,
  getChatModelLabel,
  type ChatModelKey,
} from "@/shared/chat-models";
import type { StickerId } from "@/shared/stickers/sticker-catalog";

type ChatComposerProps = {
  value: string;
  isSending: boolean;
  isDisabled: boolean;
  canSend: boolean;
  composerRef: Ref<HTMLFormElement>;
  selectedModel: ChatModelKey;
  isModelSelectorDisabled: boolean;
  isStickerPickerOpen: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectModel: (model: ChatModelKey) => void;
  onToggleStickerPicker: () => void;
  onCloseStickerPicker: () => void;
  onSendSticker: (stickerId: StickerId) => void;
};

const minTextareaHeight = 24;
const maxTextareaRows = 3;

type ComposerStyle = CSSProperties & {
  "--composer-input-height": string;
  "--composer-extra-height": string;
};

export function ChatComposer({
  value,
  isSending,
  isDisabled,
  canSend,
  composerRef,
  selectedModel,
  isModelSelectorDisabled,
  isStickerPickerOpen,
  onChange,
  onSubmit,
  onSelectModel,
  onToggleStickerPicker,
  onCloseStickerPicker,
  onSendSticker,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const skipStickerClickRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(minTextareaHeight);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 18;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const maxTextareaHeight = Math.ceil(
      lineHeight * maxTextareaRows + paddingTop + paddingBottom,
    );
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, minTextareaHeight),
      maxTextareaHeight,
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxTextareaHeight ? "auto" : "hidden";
    setTextareaHeight(nextHeight);
    setIsExpanded(nextHeight > minTextareaHeight || value.includes("\n"));
  }, [value]);

  const composerStyle: ComposerStyle = {
    "--composer-input-height": `${textareaHeight}px`,
    "--composer-extra-height": `${Math.max(
      0,
      textareaHeight - minTextareaHeight,
    )}px`,
  };

  function handleStickerTriggerPointerUp() {
    if (isDisabled) {
      return;
    }

    skipStickerClickRef.current = true;
    onToggleStickerPicker();
  }

  function handleStickerTriggerClick() {
    if (skipStickerClickRef.current) {
      skipStickerClickRef.current = false;
      return;
    }

    onToggleStickerPicker();
  }

  return (
    <div className="composer-dock" style={composerStyle}>
      <StickerPicker
        isOpen={isStickerPickerOpen}
        isDisabled={isDisabled}
        onClose={onCloseStickerPicker}
        onSelect={onSendSticker}
      />
      <form
        ref={composerRef}
        className="chat-composer"
        data-expanded={isExpanded}
        onSubmit={onSubmit}
      >
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          ref={textareaRef}
          id="chat-input"
          className="chat-composer-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Share what’s on your mind..."
          disabled={isDisabled}
          rows={1}
          aria-label="Message"
        />
        <div className="composer-toolbar">
          <div className="composer-toolbar-left">
            <button
              className="sticker-trigger-button"
              type="button"
              disabled={isDisabled}
              aria-label="Open stickers"
              aria-expanded={isStickerPickerOpen}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => {
                event.stopPropagation();
                handleStickerTriggerPointerUp();
              }}
              onClick={handleStickerTriggerClick}
            >
              +
            </button>
            <Popover
              ariaLabel="Select chat model"
              trigger={(triggerProps) => (
                <button
                  {...triggerProps}
                  className="composer-model-pill"
                  type="button"
                  aria-haspopup="menu"
                  disabled={isModelSelectorDisabled}
                >
                  Claude
                  <span>{getChatModelLabel(selectedModel)}</span>
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
          </div>
          <button
            className="chat-send-button"
            type="submit"
            disabled={!canSend}
            aria-label={isSending ? "Sending" : "Send message"}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
            >
              <path d="M5 12h13" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
