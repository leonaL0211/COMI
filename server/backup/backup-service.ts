import type {
  Conversation,
} from "@/server/repositories/conversation-repository";
import type {
  PersistedMessage,
} from "@/server/repositories/message-repository";
import type {
  ConversationSummary,
} from "@/server/repositories/summary-repository";
import type {
  Memory,
} from "@/server/repositories/memory-repository";
import type { BerryChatBackup } from "./backup-types";
import { BackupSnapshotService } from "./backup-snapshot-service";

export class BackupService {
  constructor(
    private readonly snapshots: BackupSnapshotService =
      new BackupSnapshotService(),
  ) {}

  async exportBackup(now = new Date()): Promise<BerryChatBackup> {
    const { conversations, messages, summaries, memories } =
      await this.snapshots.loadSnapshot();

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
