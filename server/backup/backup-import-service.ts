import type {
  BackupConversation,
  BackupConversationSummary,
  BackupMemory,
  BackupMessage,
} from "./backup-types";
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
import type { BackupImportRepository } from "./backup-import-repository";
import { SupabaseBackupImportRepository } from "./supabase-backup-import-repository";
import { RepositoryError } from "@/server/repositories/repository-error";
import { SupabaseConfigError } from "@/server/supabase/config";
import {
  BackupSnapshotError,
  BackupSnapshotService,
} from "./backup-snapshot-service";
import type {
  BackupImportResult,
  BackupPreviewResult,
  BackupPreviewWarning,
  EntityComparisonCounts,
  NormalizedBackup,
} from "./backup-import-types";
import { BackupImportError } from "./backup-import-types";
import { validateBackup } from "./backup-validation";

type ExistingData = {
  conversations: Map<string, BackupConversation>;
  messages: Map<string, BackupMessage>;
  summaries: Map<string, BackupConversationSummary>;
  memories: Map<string, BackupMemory>;
};

export class BackupImportService {
  constructor(
    private readonly snapshots: BackupSnapshotService =
      new BackupSnapshotService(),
    private readonly importer: BackupImportRepository =
      new SupabaseBackupImportRepository(),
  ) {}

  async preview(input: unknown): Promise<BackupPreviewResult> {
    const backup = this.validate(input);
    const existing = await this.loadExistingData();

    return compareBackup(backup, existing);
  }

  async importMerge(input: unknown): Promise<BackupImportResult> {
    const backup = this.validate(input);
    const existing = await this.loadExistingData();
    const preview = compareBackup(backup, existing);

    if (!preview.canImport) {
      throw new BackupImportError(
        "BACKUP_CONFLICT",
        409,
        "Backup import has conflicts.",
      );
    }

    return this.importer.importMerge(backup);
  }

  private validate(input: unknown): NormalizedBackup {
    const result = validateBackup(input);

    if (!result.valid) {
      throw new BackupImportError(
        "BACKUP_VALIDATION_FAILED",
        422,
        "Backup validation failed.",
        result,
      );
    }

    return result.backup;
  }

  private async loadExistingData(): Promise<ExistingData> {
    let rows: Awaited<ReturnType<BackupSnapshotService["loadSnapshot"]>>;

    try {
      rows = await this.snapshots.loadSnapshot();
    } catch (error) {
      throw toBackupServiceError(error);
    }

    const { conversations, messages, summaries, memories } = rows;

    return {
      conversations: new Map(
        conversations.map((conversation) => [
          conversation.id,
          toBackupConversation(conversation),
        ]),
      ),
      messages: new Map(
        messages.map((message) => [message.id, toBackupMessage(message)]),
      ),
      summaries: new Map(
        summaries.map((summary) => [
          summary.conversationId,
          toBackupSummary(summary),
        ]),
      ),
      memories: new Map(
        memories.map((memory) => [memory.id, toBackupMemory(memory)]),
      ),
    };
  }
}

function toBackupServiceError(error: unknown) {
  if (error instanceof BackupImportError) {
    return error;
  }

  if (
    error instanceof BackupSnapshotError ||
    error instanceof RepositoryError ||
    error instanceof SupabaseConfigError
  ) {
    return new BackupImportError(
      "BACKUP_SERVICE_UNAVAILABLE",
      503,
      "Backup data is unavailable.",
    );
  }

  return new BackupImportError(
    "BACKUP_IMPORT_FAILED",
    500,
    "Backup preview failed.",
  );
}

function compareBackup(
  backup: NormalizedBackup,
  existing: ExistingData,
): BackupPreviewResult {
  const conversations = compareEntities(
    backup.data.conversations,
    existing.conversations,
    (conversation) => conversation.id,
  );
  const messages = compareEntities(
    backup.data.messages,
    existing.messages,
    (message) => message.id,
  );
  const summaries = compareEntities(
    backup.data.summaries,
    existing.summaries,
    (summary) => summary.conversationId,
  );
  const memories = compareEntities(
    backup.data.memories,
    existing.memories,
    (memory) => memory.id,
  );
  const conflictCount =
    conversations.conflicts +
    messages.conflicts +
    summaries.conflicts +
    memories.conflicts;

  return {
    valid: true,
    format: "berry-chat-backup",
    version: 1,
    counts: {
      conversations,
      messages,
      summaries,
      memories,
    },
    warnings: getWarnings(backup, existing),
    conflictCount,
    canImport: conflictCount === 0,
  };
}

function compareEntities<T>(
  incoming: T[],
  existing: Map<string, T>,
  getId: (record: T) => string,
): EntityComparisonCounts {
  const counts: EntityComparisonCounts = {
    incoming: incoming.length,
    insertable: 0,
    identical: 0,
    conflicts: 0,
  };

  for (const record of incoming) {
    const current = existing.get(getId(record));

    if (!current) {
      counts.insertable += 1;
    } else if (stableStringify(record) === stableStringify(current)) {
      counts.identical += 1;
    } else {
      counts.conflicts += 1;
    }
  }

  return counts;
}

function getWarnings(
  backup: NormalizedBackup,
  existing: ExistingData,
): BackupPreviewWarning[] {
  const duplicateMemoryCount = countDuplicateMemories(backup, existing.memories);

  return duplicateMemoryCount > 0
    ? [{ code: "MEMORY_DUPLICATE_CONTENT", count: duplicateMemoryCount }]
    : [];
}

function countDuplicateMemories(
  backup: NormalizedBackup,
  existing: Map<string, BackupMemory>,
) {
  const existingMemoryKeys = new Map<string, Set<string>>();

  for (const memory of existing.values()) {
    const key = getMemoryContentKey(memory);
    const ids = existingMemoryKeys.get(key) ?? new Set<string>();
    ids.add(memory.id);
    existingMemoryKeys.set(key, ids);
  }

  let duplicateCount = 0;

  for (const memory of backup.data.memories) {
    const matchingIds = existingMemoryKeys.get(getMemoryContentKey(memory));

    if (matchingIds && !matchingIds.has(memory.id)) {
      duplicateCount += 1;
    }
  }

  return duplicateCount;
}

function getMemoryContentKey(memory: BackupMemory) {
  return `${memory.title}\n${memory.content}`;
}

function stableStringify(value: unknown) {
  return JSON.stringify(value);
}

function toBackupConversation(conversation: Conversation): BackupConversation {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: normalizeDate(conversation.createdAt),
    updatedAt: normalizeDate(conversation.updatedAt),
    lastMessageAt: conversation.lastMessageAt
      ? normalizeDate(conversation.lastMessageAt)
      : null,
  };
}

function toBackupMessage(message: PersistedMessage): BackupMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    model: message.model,
    stopReason: message.stopReason,
    inputTokens: message.inputTokens,
    outputTokens: message.outputTokens,
    createdAt: normalizeDate(message.createdAt),
  };
}

function toBackupSummary(
  summary: ConversationSummary,
): BackupConversationSummary {
  return {
    conversationId: summary.conversationId,
    content: summary.content,
    coveredThroughMessageId: summary.coveredThroughMessageId,
    coveredMessageCount: summary.coveredMessageCount,
    createdAt: normalizeDate(summary.createdAt),
    updatedAt: normalizeDate(summary.updatedAt),
  };
}

function toBackupMemory(memory: Memory): BackupMemory {
  return {
    id: memory.id,
    title: memory.title,
    content: memory.content,
    category: memory.category,
    importance: memory.importance,
    source: memory.source,
    isPinned: memory.isPinned,
    createdAt: normalizeDate(memory.createdAt),
    updatedAt: normalizeDate(memory.updatedAt),
  };
}

function normalizeDate(value: string) {
  return new Date(Date.parse(value)).toISOString();
}
