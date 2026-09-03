"use client";

import { useEffect, useRef } from "react";

type ComposerAttachMenuProps = {
  isOpen: boolean;
  isDisabled: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onPickStickers: () => void;
};

/**
 * The "+" button's first stop — a small chooser between an image and a
 * sticker, so both features can share one entry point without either one
 * losing its own dedicated UI. Selecting 表情包 hands off to the existing
 * StickerPicker (unchanged); selecting 图片 opens the native file picker.
 */
export function ComposerAttachMenu({
  isOpen,
  isDisabled,
  onClose,
  onPickImage,
  onPickStickers,
}: ComposerAttachMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const panel = panelRef.current;

      if (panel && !panel.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div ref={panelRef} className="composer-attach-menu" aria-label="添加内容">
      <button
        className="composer-attach-menu-item"
        type="button"
        disabled={isDisabled}
        onClick={onPickImage}
      >
        图片
      </button>
      <button
        className="composer-attach-menu-item"
        type="button"
        disabled={isDisabled}
        onClick={onPickStickers}
      >
        表情包
      </button>
    </div>
  );
}
