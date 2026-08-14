"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { UiChatMessage } from "../types";
import { GlassFade } from "./GlassFade";
import { MessageBubble } from "./MessageBubble";

/**
 * Avatar shows on the first assistant message of a conversation, and again
 * whenever the model differs from the most recent assistant message (user
 * messages in between are skipped, not compared against). Messages without
 * model metadata (old data, or a still-pending reply) are treated as one
 * shared "unknown" model so they don't falsely register as a switch.
 */
function computeAvatarVisibility(messages: UiChatMessage[]): boolean[] {
  const showAvatar = new Array<boolean>(messages.length).fill(false);
  let hasSeenAssistantMessage = false;
  let lastAssistantModel: string | null = null;

  messages.forEach((message, index) => {
    if (message.role !== "assistant") {
      return;
    }

    const currentModel = message.model ?? null;
    showAvatar[index] =
      !hasSeenAssistantMessage || currentModel !== lastAssistantModel;

    hasSeenAssistantMessage = true;
    lastAssistantModel = currentModel;
  });

  return showAvatar;
}

type MessageListProps = {
  messages: UiChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
};

export function MessageList({
  messages,
  isLoading,
  error,
  conversationId,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const avatarVisibility = useMemo(
    () => computeAvatarVisibility(messages),
    [messages],
  );
  const shouldStickToBottomRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const releaseProgrammaticScrollRef = useRef<number | null>(null);
  const scrollMetricsRef = useRef({
    scrollHeight: 0,
    scrollTop: 0,
  });
  const messageScrollKey = messages
    .map((message) =>
      [
        message.id,
        message.content.length,
        message.status ?? "",
        message.stopReason ?? "",
      ].join(":"),
    )
    .join("|");

  function isNearBottom(scrollContainer: HTMLDivElement) {
    return (
      scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight <
      96
    );
  }

  function handleScroll() {
    const scrollContainer = scrollRef.current;

    if (scrollContainer) {
      if (programmaticScrollRef.current) {
        return;
      }

      const previousMetrics = scrollMetricsRef.current;
      const didContentGrow =
        scrollContainer.scrollHeight > previousMetrics.scrollHeight;
      const didUserMoveUp =
        scrollContainer.scrollTop < previousMetrics.scrollTop - 2;

      if (
        didContentGrow &&
        shouldStickToBottomRef.current &&
        !didUserMoveUp
      ) {
        shouldStickToBottomRef.current = true;
      } else {
        shouldStickToBottomRef.current = isNearBottom(scrollContainer);
      }

      scrollMetricsRef.current = {
        scrollHeight: scrollContainer.scrollHeight,
        scrollTop: scrollContainer.scrollTop,
      };
    }
  }

  const scrollToBottom = useCallback(() => {
    const scrollContainer = scrollRef.current;

    if (!scrollContainer) {
      return;
    }

    const targetScrollTop = Math.max(
      0,
      scrollContainer.scrollHeight - scrollContainer.clientHeight,
    );
    const previousScrollBehavior = scrollContainer.style.scrollBehavior;

    programmaticScrollRef.current = true;
    scrollContainer.style.scrollBehavior = "auto";
    scrollContainer.scrollTo({
      top: targetScrollTop,
      behavior: "auto",
    });

    window.requestAnimationFrame(() => {
      const nextTargetScrollTop = Math.max(
        0,
        scrollContainer.scrollHeight - scrollContainer.clientHeight,
      );
      scrollContainer.scrollTo({
        top: nextTargetScrollTop,
        behavior: "auto",
      });
      shouldStickToBottomRef.current = true;
      scrollMetricsRef.current = {
        scrollHeight: scrollContainer.scrollHeight,
        scrollTop: scrollContainer.scrollTop,
      };

      if (releaseProgrammaticScrollRef.current !== null) {
        window.clearTimeout(releaseProgrammaticScrollRef.current);
      }

      releaseProgrammaticScrollRef.current = window.setTimeout(() => {
        scrollContainer.style.scrollBehavior = previousScrollBehavior;
        programmaticScrollRef.current = false;
        shouldStickToBottomRef.current = isNearBottom(scrollContainer);
      }, 80);
    });
  }, []);

  function handleStickerLoad() {
    if (shouldStickToBottomRef.current) {
      scrollToBottom();
    }
  }

  useEffect(() => {
    shouldStickToBottomRef.current = true;
    scrollToBottom();
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollToBottom();
    }
  }, [isLoading, messageScrollKey, scrollToBottom]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const scrollContainer = scrollRef.current;

    if (
      !content ||
      !scrollContainer ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current) {
        scrollToBottom();
      }
    });

    observer.observe(content);
    observer.observe(scrollContainer);

    return () => {
      observer.disconnect();
      if (releaseProgrammaticScrollRef.current !== null) {
        window.clearTimeout(releaseProgrammaticScrollRef.current);
      }
    };
  }, [isLoading, messages.length, scrollToBottom]);

  return (
    <section className="message-list-shell">
      <GlassFade position="top" />
      <div
        ref={scrollRef}
        className="message-list"
        aria-label="Chat history"
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="empty-state">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="comi-home-hero" aria-hidden="true">
            <span className="comi-home-glow comi-home-glow-1">
              <img src="/comi/figma/home-glow-1.svg" alt="" draggable={false} />
            </span>
            <span className="comi-home-glow comi-home-glow-2">
              <img src="/comi/figma/home-glow-2.svg" alt="" draggable={false} />
            </span>
            <span className="comi-home-glow comi-home-glow-3">
              <img src="/comi/figma/home-glow-3.svg" alt="" draggable={false} />
            </span>
            <span className="comi-home-glow comi-home-glow-4">
              <img src="/comi/figma/home-glow-4.svg" alt="" draggable={false} />
            </span>
            <p className="comi-home-title">Tell me what&rsquo;s on your mind.</p>
            <p className="comi-home-subtitle">I&rsquo;ll remember what matters.</p>
          </div>
        ) : (
          <div ref={contentRef} className="message-list-inner">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                showAvatar={avatarVisibility[index]}
                onStickerLoad={handleStickerLoad}
              />
            ))}
            {error ? <p className="chat-error">{error}</p> : null}
            <div className="message-bottom-spacer" aria-hidden="true" />
          </div>
        )}
        {messages.length === 0 && error ? (
          <p className="chat-error">{error}</p>
        ) : null}
      </div>
      <GlassFade position="bottom" />
    </section>
  );
}
