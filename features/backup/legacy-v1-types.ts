import type { StickerId } from "@/shared/stickers/sticker-catalog";

export type LegacyV1MigrationWarning = {
  code: string;
  count: number;
};

export type LegacyV1MigrationReport = {
  source: "berry-chat-v1";
  conversations: number;
  messages: number;
  memories: number;
  summaries: number;
  migratedStickers: number;
  skippedImages: number;
  skippedMessages: number;
  migratedSummaries: number;
  ignoredToolUsageMessages: number;
  warnings: LegacyV1MigrationWarning[];
};

export type NormalizedBackupFile = {
  backup: unknown;
  legacyReport: LegacyV1MigrationReport | null;
};

export type LegacyV1Conversation = {
  id: number;
  title?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  messages: LegacyV1Message[];
  summary?: unknown;
  summarizedMessageCount?: unknown;
  summaryUpdatedAt?: unknown;
};

export type LegacyV1Message = {
  id: number;
  role?: unknown;
  text?: unknown;
  stickerId?: unknown;
  images?: unknown;
  modelId?: unknown;
  finishReason?: unknown;
  isTruncated?: unknown;
  inputTokens?: unknown;
  outputTokens?: unknown;
  toolUsage?: unknown;
};

export type LegacyV1Memory = {
  id: number;
  content?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type KnownLegacyStickerId = StickerId;
