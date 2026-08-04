import { SupabaseConversationRepository } from "@/server/repositories/supabase-conversation-repository";
import { SupabaseMemoryRepository } from "@/server/repositories/supabase-memory-repository";
import { SupabaseMessageRepository } from "@/server/repositories/supabase-message-repository";
import { SupabaseSummaryRepository } from "@/server/repositories/supabase-summary-repository";
import type {
  Conversation,
  ConversationRepository,
} from "@/server/repositories/conversation-repository";
import type {
  MessageRepository,
  PersistedMessage,
} from "@/server/repositories/message-repository";
import type {
  ConversationSummary,
  SummaryRepository,
} from "@/server/repositories/summary-repository";
import type {
  Memory,
  MemoryRepository,
} from "@/server/repositories/memory-repository";
import type { BerryChatBackup } from "./backup-types";

export class BackupService {
  constructor(
    private readonly conversations: ConversationRepository =
      new SupabaseConversationRepository(),
    private readonly messages: MessageRepository = new SupabaseMessageRepository(),
    private readonly summaries: SummaryRepository = new SupabaseSummaryRepository(),
    private readonly memories: MemoryRepository = new SupabaseMemoryRepository(),
  ) {}

  async exportBackup(now = new Date()): Promise<BerryChatBackup> {
    const [conversations, messages, summaries, memories] = await Promise.all([
      this.conversations.listForBackup(),
      this.messages.listForBackup(),
      this.summaries.listForBackup(),
      this.memories.listForBackup(),
    ]);

    return {
      format: "berry-chat-backup",
      version: 1,
      exportedAt: now.toISOString(),
      source: {
        app: "berry-chat-v2",
        schemaVersion: 1,
      },
      data: {
        conversations: conversations.map(toBackupConversation),
        messages: messages.map(toBackupMessage),
        summaries: summaries.map(toBackupSummary),
        memories: memories.map(toBackupMemory),
      },
    };
  }
}

function toBackupConversation(conversation: Conversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    lastMessageAt: conversation.lastMessageAt,
  };
}

function toBackupMessage(message: PersistedMessage) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    model: message.model,
    stopReason: message.stopReason,
    inputTokens: message.inputTokens,
    outputTokens: message.outputTokens,
    createdAt: message.createdAt,
  };
}

function toBackupSummary(summary: ConversationSummary) {
  return {
    conversationId: summary.conversationId,
    content: summary.content,
    coveredThroughMessageId: summary.coveredThroughMessageId,
    coveredMessageCount: summary.coveredMessageCount,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

function toBackupMemory(memory: Memory) {
  return {
    id: memory.id,
    title: memory.title,
    content: memory.content,
    category: memory.category,
    importance: memory.importance,
    source: memory.source,
    isPinned: memory.isPinned,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
  };
}
