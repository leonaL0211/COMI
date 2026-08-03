import type { UiChatMessage } from "../types";

type MessageBubbleProps = {
  message: UiChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <article
      className={[
        "message-row",
        isUser ? "message-row-user" : "message-row-assistant",
      ].join(" ")}
    >
      <div
        className={[
          "message-bubble",
          isUser ? "message-bubble-user" : "message-bubble-assistant",
        ].join(" ")}
      >
        <p className="message-content">{message.content}</p>
        {message.status === "pending" ? (
          <p className="message-note">正在等待回复...</p>
        ) : null}
        {message.stopReason === "max_tokens" ? (
          <p className="message-warning">回复达到了输出长度上限。</p>
        ) : null}
      </div>
    </article>
  );
}
