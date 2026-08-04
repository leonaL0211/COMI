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
  Memory,
  MemoryRepository,
} from "@/server/repositories/memory-repository";
import type {
  ConversationSummary,
  SummaryRepository,
} from "@/server/repositories/summary-repository";

export type BackupSnapshot = {
  conversations: Conversation[];
  messages: PersistedMessage[];
  summaries: ConversationSummary[];
  memories: Memory[];
};

export class BackupSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupSnapshotError";
  }
}

const backupSnapshotQueryTimeoutMs = 12_000;
const backupSnapshotConcurrency = 2;

export class BackupSnapshotService {
  constructor(
    private readonly conversations: ConversationRepository =
      new SupabaseConversationRepository(),
    private readonly messages: MessageRepository = new SupabaseMessageRepository(),
    private readonly summaries: SummaryRepository = new SupabaseSummaryRepository(),
    private readonly memories: MemoryRepository = new SupabaseMemoryRepository(),
  ) {}

  async loadSnapshot(): Promise<BackupSnapshot> {
    const rows = await runLimited(
      [
        () => this.loadConversations(),
        () => this.loadMessages(),
        () => this.loadSummaries(),
        () => this.loadMemories(),
      ] as const,
      backupSnapshotConcurrency,
    );

    return {
      conversations: rows[0],
      messages: rows[1],
      summaries: rows[2],
      memories: rows[3],
    };
  }

  private loadConversations() {
    return withTimeout(
      this.conversations.listForBackup(),
      backupSnapshotQueryTimeoutMs,
    );
  }

  private loadMessages() {
    return withTimeout(this.messages.listForBackup(), backupSnapshotQueryTimeoutMs);
  }

  private loadSummaries() {
    return withTimeout(
      this.summaries.listForBackup(),
      backupSnapshotQueryTimeoutMs,
    );
  }

  private loadMemories() {
    return withTimeout(this.memories.listForBackup(), backupSnapshotQueryTimeoutMs);
  }
}

async function runLimited<T extends readonly (() => Promise<unknown>)[]>(
  tasks: T,
  concurrency: number,
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const results: unknown[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()),
  );

  return results as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new BackupSnapshotError("Backup snapshot query timed out."));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}
