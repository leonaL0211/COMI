import Image from "next/image";
import type { UiChatMessage } from "../types";
import {
  getSingleStickerFromContent,
  parseStickerContent,
} from "@/shared/stickers/sticker-catalog";

type MessageBubbleProps = {
  message: UiChatMessage;
  onStickerLoad?: () => void;
};

export function MessageBubble({ message, onStickerLoad }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const singleSticker = getSingleStickerFromContent(message.content);

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
            src="/comi/figma/chat-avatar-bg.svg"
            alt=""
            draggable={false}
          />
          <img
            className="message-avatar-logo"
            src="/comi/figma/chat-comi-avatar.png"
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
                <span key={`text-${index}`}>{part.content}</span>
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
