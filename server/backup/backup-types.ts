import type { ChatStopReason } from "@/shared/chat-types";
import type {
  MemoryCategory,
  MemoryImportance,
  MemorySource,
} from "@/server/repositories/memory-repository";

export type BerryChatBackup = {
  format: "berry-chat-backup";
  version: 1;
  exportedAt: string;
  source: {
    app: "berry-chat-v2";
    schemaVersion: 1;
  };
  data: {
    conversations: BackupConversation[];
    messages: BackupMessage[];
    summaries: BackupConversationSummary[];
    memories: BackupMemory[];
  };
};

export type BackupConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};

export type BackupMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  stopReason: ChatStopReason | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
};

export type BackupConversationSummary = {
  conversationId: string;
  content: string;
  coveredThroughMessageId: string;
  coveredMessageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BackupMemory = {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  source: MemorySource;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};
