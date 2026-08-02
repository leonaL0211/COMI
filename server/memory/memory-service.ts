import type { ChatProvider } from "@/server/providers/chat-provider";
import { OriginRouterProvider } from "@/server/providers/originrouter-provider";
import type { PersistedMessage } from "@/server/repositories/message-repository";
import type { MemoryRepository } from "@/server/repositories/memory-repository";
import { SupabaseMemoryRepository } from "@/server/repositories/supabase-memory-repository";
import { buildMemoryExtractionPrompt } from "./memory-prompt";
import {
  decideMemoryAction,
  selectMemoriesForExtraction,
} from "./memory-policy";
import type { MemoryExtractionResult } from "./memory-types";

const memoryExtractionMaxOutputTokens = 768;

export class MemoryService {
  constructor(
    private readonly memories: MemoryRepository = new SupabaseMemoryRepository(),
    private readonly provider: ChatProvider = new OriginRouterProvider(),
  ) {}

  async extractFromTurn(input: {
    userMessage: PersistedMessage;
    assistantMessage: PersistedMessage;
  }): Promise<MemoryExtractionResult> {
    try {
      const existingMemories = await this.memories.list();
      const providedMemories = selectMemoriesForExtraction(existingMemories);
      const completion = await this.provider.createChatCompletion({
        messages: buildMemoryExtractionPrompt({
          existingMemories: providedMemories,
          userMessage: input.userMessage,
          assistantMessage: input.assistantMessage,
        }),
        maxOutputTokens: memoryExtractionMaxOutputTokens,
      });

      if (completion.stopReason === "max_tokens") {
        return fallback();
      }

      const content = completion.text.trim();

      if (!content) {
        return fallback();
      }

      const payload = parseStrictJson(content);
      const decision = decideMemoryAction({
        payload,
        existingMemories,
        providedMemories,
      });

      if (decision.type === "ignore") {
        return { status: "ignored" };
      }

      if (decision.type === "create") {
        await this.memories.create({
          ...decision.input,
          source: "auto",
          isPinned: false,
        });

        return { status: "created" };
      }

      await this.memories.update(decision.id, decision.input);

      return { status: "updated" };
    } catch {
      return fallback();
    }
  }
}

function parseStrictJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  const json = fenced ? fenced[1].trim() : trimmed;

  return JSON.parse(json) as unknown;
}

function fallback(): MemoryExtractionResult {
  return { status: "fallback" };
}

