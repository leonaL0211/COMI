"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent, Ref } from "react";
import { StickerPicker } from "@/features/stickers/StickerPicker";
import {
  CHAT_MODEL_OPTIONS,
  getChatModelLabel,
  type ChatModelKey,
} from "@/shared/chat-models";
import type { StickerId } from "@/shared/stickers/sticker-catalog";
import type { PendingImage } from "../pending-image";
import { ComposerAttachMenu } from "./ComposerAttachMenu";
import { ComposerImagePreview } from "./ComposerImagePreview";

type ChatComposerProps = {
  value: string;
  isSending: boolean;
  isDisabled: boolean;
  canSend: boolean;
  composerRef: Ref<HTMLFormElement>;
  selectedModel: ChatModelKey;
  isModelSelectorDisabled: boolean;
  isStickerPickerOpen: boolean;
  pendingImage: PendingImage | null;
  imageError: string | null;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectModel: (model: ChatModelKey) => void;
  onToggleStickerPicker: () => void;
  onCloseStickerPicker: () => void;
  onSendSticker: (stickerId: StickerId) => void;
  onSelectImage: (file: File) => void;
  onRemoveImage: () => void;
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
  pendingImage,
  imageError,
  onChange,
  onSubmit,
  onSelectModel,
  onToggleStickerPicker,
  onCloseStickerPicker,
  onSendSticker,
  onSelectImage,
  onRemoveImage,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const skipStickerClickRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(minTextareaHeight);
  const [attachView, setAttachView] = useState<"menu" | "stickers">("menu");

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

  function openAttachPanel() {
    setAttachView("menu");
    onToggleStickerPicker();
  }

  function handleStickerTriggerPointerUp() {
    if (isDisabled) {
      return;
    }

    skipStickerClickRef.current = true;
    openAttachPanel();
  }

  function handleStickerTriggerClick() {
    if (skipStickerClickRef.current) {
      skipStickerClickRef.current = false;
      return;
    }

    openAttachPanel();
  }

  function handlePickImage() {
    onCloseStickerPicker();
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      onSelectImage(file);
    }
  }

  const isAttachMenuOpen = isStickerPickerOpen && attachView === "menu";
  const isStickerGridOpen = isStickerPickerOpen && attachView === "stickers";

  return (
    <div className="composer-dock" style={composerStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="选择图片"
        onChange={handleFileChange}
      />
      <ComposerAttachMenu
        isOpen={isAttachMenuOpen}
        isDisabled={isDisabled}
        onClose={onCloseStickerPicker}
        onPickImage={handlePickImage}
        onPickStickers={() => setAttachView("stickers")}
      />
      <StickerPicker
        isOpen={isStickerGridOpen}
        isDisabled={isDisabled}
        onClose={onCloseStickerPicker}
        onSelect={onSendSticker}
      />
      {/* Positioned to float above the composer (like the pickers above),
          not inside the form — .chat-composer/.composer-dock have a
          JS-driven fixed height tied to textarea growth only, so anything
          added to their normal flow would get clipped. */}
      {pendingImage ? (
        <ComposerImagePreview
          previewUrl={pendingImage.previewUrl}
          isDisabled={isDisabled}
          onRemove={onRemoveImage}
        />
      ) : null}
      {imageError ? <p className="composer-image-error">{imageError}</p> : null}
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
              aria-label="添加图片或表情包"
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
            <label className="composer-model-native">
              <span className="composer-model-pill" aria-hidden="true">
                Claude
                <span>{getChatModelLabel(selectedModel)}</span>
              </span>
              <select
                className="composer-model-select"
                aria-label="Choose model"
                value={selectedModel}
                disabled={isModelSelectorDisabled}
                onChange={(event) =>
                  onSelectModel(event.target.value as ChatModelKey)
                }
              >
                {CHAT_MODEL_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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
