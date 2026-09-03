"use client";

import { useState } from "react";
import Image from "next/image";
import type { UiChatMessage } from "../types";
import {
  getSingleStickerFromContent,
  parseStickerContent,
} from "@/shared/stickers/sticker-catalog";
import {
  isImageOnlyContent,
  parseImageContent,
} from "@/shared/attachments/image-catalog";

type MessageBubbleProps = {
  message: UiChatMessage;
  onStickerLoad?: () => void;
};

export function MessageBubble({ message, onStickerLoad }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const singleSticker = getSingleStickerFromContent(message.content);
  const isImageOnly = !singleSticker && isImageOnlyContent(message.content);

  return (
    <article
      className={[
        "message-row",
        isUser ? "message-row-user" : "message-row-assistant",
      ].join(" ")}
    >
      {!isUser ? (
        <span className="message-avatar" aria-hidden="true">
          <img
            className="message-avatar-bg"
            src="/comi/figma/chat-avatar-bg.svg?v=20260813-cache-fix"
            alt=""
            draggable={false}
          />
          <img
            className="message-avatar-logo"
            src="/comi/figma/chat-comi-avatar.png?v=20260813-cache-fix"
            alt=""
            draggable={false}
          />
        </span>
      ) : null}
      <div
        className={[
          "message-bubble",
          isUser ? "message-bubble-user" : "message-bubble-assistant",
          singleSticker ? "message-bubble-sticker-only" : "",
          isImageOnly ? "message-bubble-image-only" : "",
        ].join(" ")}
      >
        {singleSticker ? (
          <Image
            className="message-sticker message-sticker-standalone"
            src={singleSticker.src}
            alt={singleSticker.alt}
            width={singleSticker.width}
            height={singleSticker.height}
            draggable={false}
            onLoad={onStickerLoad}
          />
        ) : (
          <div className="message-content">
            {parseStickerContent(message.content).map((part, index) =>
              part.type === "sticker" ? (
                <Image
                  key={`${part.token}-${index}`}
                  className="message-sticker message-sticker-inline"
                  src={part.sticker.src}
                  alt={part.sticker.alt}
                  width={part.sticker.width}
                  height={part.sticker.height}
                  draggable={false}
                  onLoad={onStickerLoad}
                />
              ) : (
                parseImageContent(part.content).map((imagePart, imageIndex) =>
                  imagePart.type === "image" ? (
                    <MessageImage
                      key={`${imagePart.token}-${index}-${imageIndex}`}
                      imageUrl={message.imageUrl ?? null}
                      onLoad={onStickerLoad}
                    />
                  ) : imagePart.content ? (
                    <span key={`text-${index}-${imageIndex}`}>
                      {imagePart.content}
                    </span>
                  ) : null,
                )
              ),
            )}
          </div>
        )}
        {message.status === "pending" ? (
          <p className="message-note">Waiting for reply...</p>
        ) : null}
        {message.stopReason === "max_tokens" ? (
          <p className="message-warning">Reply reached the output limit.</p>
        ) : null}
      </div>
    </article>
  );
}

function MessageImage({
  imageUrl,
  onLoad,
}: {
  imageUrl: string | null;
  onLoad?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return <p className="message-image-unavailable">图片已不可用</p>;
  }

  return (
    // Signed Supabase Storage URL, not a local/static asset next/image can optimize.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="message-image"
      src={imageUrl}
      alt="用户发送的图片"
      onLoad={onLoad}
      onError={() => setFailed(true)}
    />
  );
}
