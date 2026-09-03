import type { ChatMessage } from "@/shared/chat-types";
import type { PersistedMessage } from "@/server/repositories/message-repository";
import type { SummaryServiceResult } from "./types";
import { describeStickerContentForModel } from "@/shared/stickers/sticker-catalog";
import { describeImageContentForModel } from "@/shared/attachments/image-catalog";

export function buildChatContext(input: {
  messages: PersistedMessage[];
  currentUserMessageId: string;
  summaryResult: SummaryServiceResult;
}): ChatMessage[] {
  const currentUserCount = input.messages.filter(
    (message) => message.id === input.currentUserMessageId,
  ).length;

  if (currentUserCount !== 1) {
    return toChatMessages(input.messages);
  }

  if (input.summaryResult.status === "fallback") {
    return toChatMessages(input.messages);
  }

  const summary = input.summaryResult.summary;

  if (!summary) {
    return toChatMessages(input.messages);
  }

  const checkpointIndex = input.messages.findIndex(
    (message) => message.id === summary.coveredThroughMessageId,
  );

  if (checkpointIndex < 0 || input.messages[checkpointIndex]?.role !== "assistant") {
    return toChatMessages(input.messages);
  }

  return [
    {
      role: "system",
      content: [
        "以下是当前会话较早内容的压缩摘要。",
        "它仅作为背景；如与较新的原始消息冲突，以较新的原始消息为准：",
        summary.content,
      ].join("\n"),
    },
    ...toChatMessages(input.messages.slice(checkpointIndex + 1)),
  ];
}

function toChatMessages(messages: PersistedMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    // Default/safe shape for every message, including the current turn's:
    // image tokens become neutral placeholder text here. When the current
    // turn actually has a fresh image to send, persistent-chat-service.ts
    // overwrites just the last entry's content with the real caption (and
    // passes the image bytes separately) — this function never sends raw
    // image bytes anywhere.
    content: describeImageContentForModel(
      describeStickerContentForModel(message.content, message.role),
      message.role,
    ),
  }));
}
