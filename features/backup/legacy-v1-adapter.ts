"use client";

import {
  createStickerToken,
  isStickerId,
} from "@/shared/stickers/sticker-catalog";
import type {
  KnownLegacyStickerId,
  LegacyV1Conversation,
  LegacyV1Memory,
  LegacyV1Message,
  LegacyV1MigrationReport,
  LegacyV1MigrationWarning,
  NormalizedBackupFile,
} from "./legacy-v1-types";

type V2Backup = {
  format: "berry-chat-backup";
  version: 1;
  exportedAt: string;
  source: {
    app: "berry-chat-v2";
    schemaVersion: 1;
  };
  data: {
    conversations: V2Conversation[];
    messages: V2Message[];
    summaries: V2Summary[];
    memories: V2Memory[];
  };
};

type V2Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};

type V2Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  stopReason: "end_turn" | "max_tokens" | "unknown" | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
};

type V2Summary = {
  conversationId: string;
  content: string;
  coveredThroughMessageId: string;
  coveredMessageCount: number;
  createdAt: string;
  updatedAt: string;
};

type V2Memory = {
  id: string;
  title: string;
  content: string;
  category: "general";
  importance: 3;
  source: "manual";
  isPinned: false;
  createdAt: string;
  updatedAt: string;
};

type WarningCounter = Map<string, number>;

const maxTitleLength = 160;
const maxMemoryContentLength = 2000;

export async function normalizeBackupForRestore(
  input: unknown,
): Promise<NormalizedBackupFile> {
  if (isV2Backup(input)) {
    return {
      backup: input,
      legacyReport: null,
    };
  }

  if (!isLegacyV1Backup(input)) {
    throw new LegacyV1AdapterError("无法识别这个 Berry Chat 备份文件。");
  }

  const converted = await convertLegacyV1Backup(input);

  return {
    backup: converted.backup,
    legacyReport: converted.report,
  };
}

export class LegacyV1AdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LegacyV1AdapterError";
  }
}

async function convertLegacyV1Backup(input: Record<string, unknown>) {
  const data = input.data as Record<string, unknown>;
  const legacyConversations = data.conversations as LegacyV1Conversation[];
  const legacyMemories = Array.isArray(data.memories)
    ? data.memories.filter(isLegacyMemory)
    : [];
  const warnings: WarningCounter = new Map();
  const conversations: V2Conversation[] = [];
  const messages: V2Message[] = [];
  const summaries: V2Summary[] = [];
  const memories: V2Memory[] = [];
  let migratedStickers = 0;
  let skippedImages = 0;
  let skippedMessages = 0;
  let ignoredToolUsageMessages = 0;

  for (const legacyConversation of legacyConversations) {
    const conversationId = await deterministicUuid(
      `berry-chat-v1:conversation:${legacyConversation.id}`,
    );
    const createdAt = normalizeDateOrNull(legacyConversation.createdAt);
    const conversationCreatedAt = createdAt ?? new Date(0).toISOString();
    const updatedAt =
      normalizeDateOrNull(legacyConversation.updatedAt) ??
      conversationCreatedAt;
    const convertedMessages: V2Message[] = [];
    const migratedMessageIdsByOriginalIndex = new Map<number, string>();
    const baseTime = Date.parse(conversationCreatedAt);

    if (legacyConversation.messages.length > 0) {
      incrementWarning(warnings, "MESSAGE_TIMESTAMPS_APPROXIMATED");
    }

    for (const legacyMessage of legacyConversation.messages) {
      const originalIndex = legacyConversation.messages.indexOf(legacyMessage);
      const role = readRole(legacyMessage.role);

      if (!role) {
        incrementWarning(warnings, "MESSAGE_SKIPPED_INVALID_ROLE");
        skippedMessages += 1;
        continue;
      }

      const text = typeof legacyMessage.text === "string"
        ? legacyMessage.text
        : "";
      const stickerId = readKnownStickerId(legacyMessage.stickerId);
      const imageCount = countLegacyImages(legacyMessage.images);

      if (imageCount > 0) {
        skippedImages += imageCount;
        incrementWarning(warnings, "IMAGES_SKIPPED", imageCount);
      }

      if (
        legacyMessage.stickerId !== undefined &&
        legacyMessage.stickerId !== null &&
        !stickerId
      ) {
        incrementWarning(warnings, "UNKNOWN_STICKER");
      }

      if (legacyMessage.toolUsage !== undefined) {
        ignoredToolUsageMessages += 1;
        incrementWarning(warnings, "TOOL_USAGE_IGNORED");
      }

      const stickerToken = stickerId ? createStickerToken(stickerId) : "";
      const content = [
        text.trim().length > 0 ? text : "",
        stickerToken,
      ].filter(Boolean).join("\n\n");

      if (!content.trim()) {
        incrementWarning(warnings, "MESSAGE_SKIPPED_EMPTY_AFTER_MIGRATION");
        skippedMessages += 1;
        continue;
      }

      if (stickerId) {
        migratedStickers += 1;
      }

      const messageId = await deterministicUuid(
        `berry-chat-v1:message:${legacyConversation.id}:${legacyMessage.id}`,
      );
      const messageCreatedAt = new Date(baseTime + convertedMessages.length)
        .toISOString();
      const message: V2Message = {
        id: messageId,
        conversationId,
        role,
        content,
        model:
          role === "assistant" && typeof legacyMessage.modelId === "string"
            ? legacyMessage.modelId
            : null,
        stopReason: readStopReason(legacyMessage, role),
        inputTokens: readNonNegativeInteger(legacyMessage.inputTokens),
        outputTokens: readNonNegativeInteger(legacyMessage.outputTokens),
        createdAt: messageCreatedAt,
      };

      convertedMessages.push(message);
      migratedMessageIdsByOriginalIndex.set(originalIndex, messageId);
    }

    const title = normalizeTitle(legacyConversation.title, warnings);

    conversations.push({
      id: conversationId,
      title,
      createdAt: conversationCreatedAt,
      updatedAt,
      lastMessageAt:
        convertedMessages.at(-1)?.createdAt ?? null,
    });
    messages.push(...convertedMessages);

    const summary = convertSummary(
      legacyConversation,
      conversationId,
      migratedMessageIdsByOriginalIndex,
      updatedAt,
      warnings,
    );

    if (summary) {
      summaries.push(summary);
    }
  }

  for (const legacyMemory of legacyMemories) {
    const convertedMemory = await convertMemory(legacyMemory, warnings);

    if (convertedMemory) {
      memories.push(convertedMemory);
    }
  }

  const backup: V2Backup = {
    format: "berry-chat-backup",
    version: 1,
    exportedAt:
      normalizeDateOrNull(input.exportedAt) ?? new Date().toISOString(),
    source: {
      app: "berry-chat-v2",
      schemaVersion: 1,
    },
    data: {
      conversations,
      messages,
      summaries,
      memories,
    },
  };
  const report: LegacyV1MigrationReport = {
    source: "berry-chat-v1",
    conversations: conversations.length,
    messages: messages.length,
    memories: memories.length,
    summaries: summaries.length,
    migratedStickers,
    skippedImages,
    skippedMessages,
    migratedSummaries: summaries.length,
    ignoredToolUsageMessages,
    warnings: toWarningList(warnings),
  };

  return { backup, report };
}

function isV2Backup(value: unknown) {
  return (
    isPlainObject(value) &&
    value.format === "berry-chat-backup" &&
    value.version === 1 &&
    isPlainObject(value.source) &&
    value.source.app === "berry-chat-v2"
  );
}

function isLegacyV1Backup(
  value: unknown,
): value is Record<string, unknown> {
  if (
    !isPlainObject(value) ||
    value.version !== 1 ||
    Object.hasOwn(value, "format") ||
    !isPlainObject(value.data)
  ) {
    return false;
  }

  const conversations = value.data.conversations;

  return (
    Array.isArray(conversations) &&
    conversations.every(isLegacyConversation)
  );
}

function isLegacyConversation(value: unknown): value is LegacyV1Conversation {
  return (
    isPlainObject(value) &&
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    Array.isArray(value.messages) &&
    value.messages.every(isLegacyMessage)
  );
}

function isLegacyMessage(value: unknown): value is LegacyV1Message {
  return (
    isPlainObject(value) &&
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id)
  );
}

function isLegacyMemory(value: unknown): value is LegacyV1Memory {
  return (
    isPlainObject(value) &&
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id)
  );
}

async function deterministicUuid(input: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const uuidBytes = new Uint8Array(bytes).slice(0, 16);
  uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x50;
  uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80;
  const hex = Array.from(uuidBytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function normalizeDateOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const time = Date.parse(value);

  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function normalizeTitle(value: unknown, warnings: WarningCounter) {
  const title = typeof value === "string" ? value.trim() : "";

  if (!title) {
    return "旧版会话";
  }

  if (title.length > maxTitleLength) {
    incrementWarning(warnings, "TITLE_TRUNCATED");
    return title.slice(0, maxTitleLength);
  }

  return title;
}

function readRole(value: unknown): "user" | "assistant" | null {
  return value === "user" || value === "assistant" ? value : null;
}

function readKnownStickerId(value: unknown): KnownLegacyStickerId | null {
  return isStickerId(value) ? value : null;
}

function readStopReason(
  message: LegacyV1Message,
  role: "user" | "assistant",
): V2Message["stopReason"] {
  if (role === "user") {
    return null;
  }

  if (message.isTruncated === true || message.finishReason === "max_tokens") {
    return "max_tokens";
  }

  if (message.finishReason === "end_turn") {
    return "end_turn";
  }

  return "unknown";
}

function readNonNegativeInteger(value: unknown) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

function countLegacyImages(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function convertSummary(
  legacyConversation: LegacyV1Conversation,
  conversationId: string,
  migratedMessageIdsByOriginalIndex: Map<number, string>,
  fallbackDate: string,
  warnings: WarningCounter,
): V2Summary | null {
  const content = typeof legacyConversation.summary === "string"
    ? legacyConversation.summary.trim()
    : "";
  const coveredMessageCount = legacyConversation.summarizedMessageCount;

  if (!content) {
    return null;
  }

  if (
    typeof coveredMessageCount !== "number" ||
    !Number.isSafeInteger(coveredMessageCount) ||
    coveredMessageCount <= 0 ||
    coveredMessageCount > legacyConversation.messages.length
  ) {
    incrementWarning(warnings, "SUMMARY_SKIPPED");
    return null;
  }

  const coveredThroughMessageId =
    migratedMessageIdsByOriginalIndex.get(coveredMessageCount - 1);

  if (!coveredThroughMessageId) {
    incrementWarning(warnings, "SUMMARY_SKIPPED");
    return null;
  }

  const timestamp =
    normalizeDateOrNull(legacyConversation.summaryUpdatedAt) ?? fallbackDate;

  return {
    conversationId,
    content,
    coveredThroughMessageId,
    coveredMessageCount,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function convertMemory(
  legacyMemory: LegacyV1Memory,
  warnings: WarningCounter,
): Promise<V2Memory | null> {
  const content = typeof legacyMemory.content === "string"
    ? legacyMemory.content.trim()
    : "";

  if (!content) {
    incrementWarning(warnings, "MEMORY_SKIPPED_EMPTY");
    return null;
  }

  if (content.length > maxMemoryContentLength) {
    incrementWarning(warnings, "MEMORY_SKIPPED_TOO_LONG");
    return null;
  }

  const createdAt =
    normalizeDateOrNull(legacyMemory.createdAt) ?? new Date(0).toISOString();
  const updatedAt = normalizeDateOrNull(legacyMemory.updatedAt) ?? createdAt;
  const id = await deterministicUuid(
    `berry-chat-v1:memory:${legacyMemory.id}:${createdAt}`,
  );

  return {
    id,
    title: createMemoryTitle(content),
    content,
    category: "general",
    importance: 3,
    source: "manual",
    isPinned: false,
    createdAt,
    updatedAt,
  };
}

function createMemoryTitle(content: string) {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const title = (firstLine || content).trim().slice(0, 40);

  return title || "旧版记忆";
}

function incrementWarning(
  warnings: WarningCounter,
  code: string,
  count = 1,
) {
  warnings.set(code, (warnings.get(code) ?? 0) + count);
}

function toWarningList(warnings: WarningCounter): LegacyV1MigrationWarning[] {
  return Array.from(warnings, ([code, count]) => ({ code, count }));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
