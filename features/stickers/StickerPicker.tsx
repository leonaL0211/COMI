"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  stickerCatalog,
  type StickerId,
} from "@/shared/stickers/sticker-catalog";

type StickerPickerProps = {
  isOpen: boolean;
  isDisabled: boolean;
  onClose: () => void;
  onSelect: (stickerId: StickerId) => void;
};

export function StickerPicker({
  isOpen,
  isDisabled,
  onClose,
  onSelect,
}: StickerPickerProps) {
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
    <div
      ref={panelRef}
      className="sticker-picker"
      aria-label="表情包选择面板"
    >
      <div className="sticker-picker-grid">
        {stickerCatalog.map((sticker) => (
          <button
            key={sticker.id}
            className="sticker-picker-item"
            type="button"
            disabled={isDisabled}
            aria-label={`发送表情包：${sticker.label}`}
            onClick={() => onSelect(sticker.id)}
          >
            <Image
              className="sticker-picker-image"
              src={sticker.src}
              alt={sticker.alt}
              width={sticker.width}
              height={sticker.height}
              draggable={false}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
