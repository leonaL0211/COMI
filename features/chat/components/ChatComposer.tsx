"use client";

import { useLayoutEffect, useRef } from "react";
import type { FormEvent, Ref } from "react";
import { StickerPicker } from "@/features/stickers/StickerPicker";
import type { StickerId } from "@/shared/stickers/sticker-catalog";

type ChatComposerProps = {
  value: string;
  isSending: boolean;
  isDisabled: boolean;
  canSend: boolean;
  composerRef: Ref<HTMLFormElement>;
  isStickerPickerOpen: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleStickerPicker: () => void;
  onCloseStickerPicker: () => void;
  onSendSticker: (stickerId: StickerId) => void;
};

export function ChatComposer({
  value,
  isSending,
  isDisabled,
  canSend,
  composerRef,
  isStickerPickerOpen,
  onChange,
  onSubmit,
  onToggleStickerPicker,
  onCloseStickerPicker,
  onSendSticker,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <div className="composer-dock">
      <StickerPicker
        isOpen={isStickerPickerOpen}
        isDisabled={isDisabled}
        onClose={onCloseStickerPicker}
        onSelect={onSendSticker}
      />
      <form ref={composerRef} className="chat-composer" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="chat-input">
          消息
        </label>
        <button
          className="sticker-trigger-button"
          type="button"
          disabled={isDisabled}
          aria-label="打开表情包"
          aria-expanded={isStickerPickerOpen}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onToggleStickerPicker}
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
            <circle cx="12" cy="12" r="9" />
            <path d="M9 10h.01" />
            <path d="M15 10h.01" />
            <path d="M8.5 14.5c1.8 1.6 5.2 1.6 7 0" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          id="chat-input"
          className="chat-composer-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="说点什么..."
          disabled={isDisabled}
          rows={1}
          aria-label="消息"
        />
        <button
          className="chat-send-button"
          type="submit"
          disabled={!canSend}
        >
          {isSending ? "发送中" : "发送"}
        </button>
      </form>
    </div>
  );
}
