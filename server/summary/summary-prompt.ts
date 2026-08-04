import type { ChatMessage } from "@/shared/chat-types";
import type { PersistedMessage } from "@/server/repositories/message-repository";
import type { ConversationSummary } from "@/server/repositories/summary-repository";
import { describeStickerContentForModel } from "@/shared/stickers/sticker-catalog";

export function buildSummaryPrompt(input: {
  previousSummary: ConversationSummary | null;
  messagesToSummarize: PersistedMessage[];
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You update a rolling summary for one private chat conversation.",
        "Merge OLD SUMMARY and NEW MESSAGES TO INCORPORATE into one current conversation summary.",
        "Preserve explicit facts, people, relationships, user preferences, decisions, agreements, ongoing tasks, important progress, unresolved questions, and background that later turns still need.",
        "Remove greetings, repetition, irrelevant elaboration, and details that do not affect later understanding.",
        "Do not invent information. Do not turn guesses into facts.",
        "If the old summary conflicts with newer explicit messages, follow the newer messages.",
        "Keep the main conversation language. If the conversation is mainly Chinese, write Chinese.",
        "Write compact, natural, clearly structured text.",
        "Do not start with phrases like 'Here is the summary'.",
        "Do not use large Markdown heading stacks.",
        "Only output the summary body.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "OLD SUMMARY",
        input.previousSummary?.content.trim() || "(none)",
        "",
        "NEW MESSAGES TO INCORPORATE",
        formatMessages(input.messagesToSummarize),
      ].join("\n"),
    },
  ];
}

function formatMessages(messages: PersistedMessage[]) {
  return messages
    .map(
      (message) =>
        `${message.role.toUpperCase()}: ${describeStickerContentForModel(
          message.content,
          message.role,
        )}`,
    )
    .join("\n\n");
}
