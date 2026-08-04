import type { PersistedMessage } from "@/server/repositories/message-repository";
import type { ChatMessage } from "@/shared/chat-types";
import type { MemoryExtractionPromptMemory } from "./memory-types";
import { describeStickerContentForModel } from "@/shared/stickers/sticker-catalog";

export function buildMemoryExtractionPrompt(input: {
  existingMemories: MemoryExtractionPromptMemory[];
  userMessage: PersistedMessage;
  assistantMessage: PersistedMessage;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You decide whether one completed chat turn should update a private long-term memory library.",
        "Only use information explicitly stated by CURRENT USER MESSAGE as a user fact.",
        "CURRENT ASSISTANT MESSAGE is context only and is not a source of user facts.",
        "Save only stable, long-term, reusable information.",
        "Return ignore for greetings, temporary emotions, one-off tasks, daily schedules, temporary locations, weather, roleplay, fiction, guesses, diagnoses, or assistant suggestions.",
        "Never infer, diagnose, complete missing details, or turn speculation into fact.",
        "Never save passwords, verification codes, API keys, tokens, bank accounts, payment details, identity document numbers, exact home addresses, login credentials, private keys, or recovery phrases.",
        "If the new fact is identical to an existing memory, return ignore.",
        "If the user explicitly corrects an existing memory, return update with the matching provided memory id.",
        "If you cannot identify the exact existing memory id to update, return ignore instead of creating a near duplicate.",
        "Create must not include id. Update must use a provided memory id. Ignore needs no other fields.",
        "Do not modify pin/source/time/internal fields.",
        "At most one action is allowed; choose the single most important durable item.",
        "Output strict JSON only, with no Markdown, explanation, prefix, or suffix.",
        'Shape: {"action":{"type":"create"|"update"|"ignore","id":"only for update","title":"only for create/update","content":"only for create/update","category":"general|preference|person|project|health|routine|other","importance":1}}',
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "EXISTING MEMORIES",
        JSON.stringify(input.existingMemories),
        "",
        "CURRENT USER MESSAGE",
        describeStickerContentForModel(input.userMessage.content, "user"),
        "",
        "CURRENT ASSISTANT MESSAGE",
        describeStickerContentForModel(
          input.assistantMessage.content,
          "assistant",
        ),
      ].join("\n"),
    },
  ];
}
