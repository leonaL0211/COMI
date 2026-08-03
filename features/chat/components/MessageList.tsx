"use client";

import { useEffect, useRef } from "react";
import type { UiChatMessage } from "../types";
import { GlassFade } from "./GlassFade";
import { MessageBubble } from "./MessageBubble";

type MessageListProps = {
  messages: UiChatMessage[];
  isLoading: boolean;
  error: string | null;
};

export function MessageList({ messages, isLoading, error }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;

    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isLoading]);

  return (
    <section className="message-list-shell">
      <GlassFade position="top" />
      <div ref={scrollRef} className="message-list" aria-label="聊天记录">
        {isLoading ? (
          <div className="empty-state">正在加载消息...</div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <p className="text-base font-medium">从一句话开始。</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              新对话会在第一次发送时自动保存。
            </p>
          </div>
        ) : (
          <div className="message-list-inner">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {error ? <p className="chat-error">{error}</p> : null}
          </div>
        )}
        {messages.length === 0 && error ? <p className="chat-error">{error}</p> : null}
      </div>
      <GlassFade position="bottom" />
    </section>
  );
}
