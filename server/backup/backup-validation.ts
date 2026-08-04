import {
  memoryCategories,
  memorySources,
} from "@/server/repositories/memory-repository";
import type {
  BackupConversation,
  BackupConversationSummary,
  BackupMemory,
  BackupMessage,
  BerryChatBackup,
} from "./backup-types";
import type {
  BackupValidationFailure,
  BackupValidationIssue,
  NormalizedBackup,
} from "./backup-import-types";

const maxReturnedIssues = 100;
const maxArrayCounts = {
  conversations: 5000,
  messages: 50000,
  summaries: 5000,
  memories: 5000,
};
const maxInteger = 2147483647;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const unsafeKeys = new Set(["__proto__", "prototype", "constructor"]);
const stopReasons = new Set(["end_turn", "max_tokens", "unknown"]);

type ValidationSuccess = {
  valid: true;
  backup: NormalizedBackup;
};

type ValidationResult = ValidationSuccess | BackupValidationFailure;

type ValidationContext = {
  issues: BackupValidationIssue[];
  totalIssueCount: number;
};

export function validateBackup(input: unknown): ValidationResult {
  const context: ValidationContext = {
    issues: [],
    totalIssueCount: 0,
  };

  if (!isPlainObject(input)) {
    addIssue(context, "INVALID_OBJECT", "");
    return toFailure(context);
  }

  validateAllowedKeys(
    context,
    input,
    "",
    ["format", "version", "exportedAt", "source", "data"],
  );

  const format = readLiteral(
    context,
    input,
    "format",
    "berry-chat-backup",
    "INVALID_BACKUP_FORMAT",
  );
  const version = readLiteral(
    context,
    input,
    "version",
    1,
    "UNSUPPORTED_BACKUP_VERSION",
  );
  const exportedAt = readDate(context, input, "exportedAt");
  const source = readSource(context, input.source, "source");
  const data = readData(context, input.data, "data");

  if (context.totalIssueCount > 0) {
    return toFailure(context);
  }

  const backup: BerryChatBackup = {
    format,
    version,
    exportedAt,
    source,
    data,
  };

  validateReferences(context, backup);

  if (context.totalIssueCount > 0) {
    return toFailure(context);
  }

  return {
    valid: true,
    backup,
  };
}

function readSource(
  context: ValidationContext,
  value: unknown,
  path: string,
) {
  if (!isPlainObject(value)) {
    addIssue(context, "INVALID_OBJECT", path);
    return {
      app: "berry-chat-v2" as const,
      schemaVersion: 1 as const,
    };
  }

  validateAllowedKeys(context, value, path, ["app", "schemaVersion"]);

  return {
    app: readLiteral(
      context,
      value,
      `${path}.app`,
      "berry-chat-v2",
      "INVALID_SOURCE_APP",
    ),
    schemaVersion: readLiteral(
      context,
      value,
      `${path}.schemaVersion`,
      1,
      "INVALID_SOURCE_SCHEMA_VERSION",
    ),
  };
}

function readData(
  context: ValidationContext,
  value: unknown,
  path: string,
) {
  if (!isPlainObject(value)) {
    addIssue(context, "INVALID_OBJECT", path);
    return {
      conversations: [],
      messages: [],
      summaries: [],
      memories: [],
    };
  }

  validateAllowedKeys(context, value, path, [
    "conversations",
    "messages",
    "summaries",
    "memories",
  ]);

  return {
    conversations: readRecordArray(
      context,
      value.conversations,
      `${path}.conversations`,
      maxArrayCounts.conversations,
      readConversation,
    ),
    messages: readRecordArray(
      context,
      value.messages,
      `${path}.messages`,
      maxArrayCounts.messages,
      readMessage,
    ),
    summaries: readRecordArray(
      context,
      value.summaries,
      `${path}.summaries`,
      maxArrayCounts.summaries,
      readSummary,
    ),
    memories: readRecordArray(
      context,
      value.memories,
      `${path}.memories`,
      maxArrayCounts.memories,
      readMemory,
    ),
  };
}

function readConversation(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
): BackupConversation {
  validateAllowedKeys(context, record, path, [
    "id",
    "title",
    "createdAt",
    "updatedAt",
    "lastMessageAt",
  ]);

  const title = readString(context, record, `${path}.title`);
  validateTrimmedLength(context, title, `${path}.title`, 1, 160);

  return {
    id: readUuid(context, record, `${path}.id`),
    title,
    createdAt: readDate(context, record, `${path}.createdAt`),
    updatedAt: readDate(context, record, `${path}.updatedAt`),
    lastMessageAt: readNullableDate(context, record, `${path}.lastMessageAt`),
  };
}

function readMessage(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
): BackupMessage {
  validateAllowedKeys(context, record, path, [
    "id",
    "conversationId",
    "role",
    "content",
    "model",
    "stopReason",
    "inputTokens",
    "outputTokens",
    "createdAt",
  ]);

  const content = readString(context, record, `${path}.content`);
  validateTrimmedLength(context, content, `${path}.content`, 1);

  return {
    id: readUuid(context, record, `${path}.id`),
    conversationId: readUuid(context, record, `${path}.conversationId`),
    role: readEnum(context, record, `${path}.role`, ["user", "assistant"]),
    content,
    model: readNullableString(context, record, `${path}.model`),
    stopReason: readNullableEnum(
      context,
      record,
      `${path}.stopReason`,
      stopReasons,
    ),
    inputTokens: readNullableInteger(context, record, `${path}.inputTokens`, 0),
    outputTokens: readNullableInteger(
      context,
      record,
      `${path}.outputTokens`,
      0,
    ),
    createdAt: readDate(context, record, `${path}.createdAt`),
  };
}

function readSummary(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
): BackupConversationSummary {
  validateAllowedKeys(context, record, path, [
    "conversationId",
    "content",
    "coveredThroughMessageId",
    "coveredMessageCount",
    "createdAt",
    "updatedAt",
  ]);

  const content = readString(context, record, `${path}.content`);
  validateTrimmedLength(context, content, `${path}.content`, 1);

  return {
    conversationId: readUuid(context, record, `${path}.conversationId`),
    content,
    coveredThroughMessageId: readUuid(
      context,
      record,
      `${path}.coveredThroughMessageId`,
    ),
    coveredMessageCount: readInteger(
      context,
      record,
      `${path}.coveredMessageCount`,
      1,
    ),
    createdAt: readDate(context, record, `${path}.createdAt`),
    updatedAt: readDate(context, record, `${path}.updatedAt`),
  };
}

function readMemory(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
): BackupMemory {
  validateAllowedKeys(context, record, path, [
    "id",
    "title",
    "content",
    "category",
    "importance",
    "source",
    "isPinned",
    "createdAt",
    "updatedAt",
  ]);

  const title = readString(context, record, `${path}.title`);
  const content = readString(context, record, `${path}.content`);
  validateTrimmedLength(context, title, `${path}.title`, 1, 160);
  validateTrimmedLength(context, content, `${path}.content`, 1, 2000);

  return {
    id: readUuid(context, record, `${path}.id`),
    title,
    content,
    category: readEnum(
      context,
      record,
      `${path}.category`,
      memoryCategories,
    ),
    importance: readInteger(
      context,
      record,
      `${path}.importance`,
      1,
      5,
    ) as BackupMemory["importance"],
    source: readEnum(context, record, `${path}.source`, memorySources),
    isPinned: readBoolean(context, record, `${path}.isPinned`),
    createdAt: readDate(context, record, `${path}.createdAt`),
    updatedAt: readDate(context, record, `${path}.updatedAt`),
  };
}

function validateReferences(context: ValidationContext, backup: BerryChatBackup) {
  const conversationIds = new Set<string>();
  const messageIds = new Set<string>();
  const memoryIds = new Set<string>();
  const summaryConversationIds = new Set<string>();
  const messageConversationIds = new Map<string, string>();
  const messageCountsByConversation = new Map<string, number>();

  backup.data.conversations.forEach((conversation, index) => {
    checkUnique(
      context,
      conversationIds,
      conversation.id,
      `data.conversations[${index}].id`,
    );
  });

  backup.data.messages.forEach((message, index) => {
    const path = `data.messages[${index}]`;
    checkUnique(context, messageIds, message.id, `${path}.id`);

    if (!conversationIds.has(message.conversationId)) {
      addIssue(context, "INVALID_REFERENCE", `${path}.conversationId`);
    }

    messageConversationIds.set(message.id, message.conversationId);
    messageCountsByConversation.set(
      message.conversationId,
      (messageCountsByConversation.get(message.conversationId) ?? 0) + 1,
    );
  });

  backup.data.summaries.forEach((summary, index) => {
    const path = `data.summaries[${index}]`;
    checkUnique(
      context,
      summaryConversationIds,
      summary.conversationId,
      `${path}.conversationId`,
    );

    if (!conversationIds.has(summary.conversationId)) {
      addIssue(context, "INVALID_REFERENCE", `${path}.conversationId`);
    }

    const checkpointConversation = messageConversationIds.get(
      summary.coveredThroughMessageId,
    );

    if (!checkpointConversation) {
      addIssue(context, "INVALID_REFERENCE", `${path}.coveredThroughMessageId`);
    } else if (checkpointConversation !== summary.conversationId) {
      addIssue(context, "INVALID_CHECKPOINT", `${path}.coveredThroughMessageId`);
    }

    if (
      summary.coveredMessageCount >
      (messageCountsByConversation.get(summary.conversationId) ?? 0)
    ) {
      addIssue(context, "INVALID_COUNT", `${path}.coveredMessageCount`);
    }
  });

  backup.data.memories.forEach((memory, index) => {
    checkUnique(context, memoryIds, memory.id, `data.memories[${index}].id`);
  });
}

function readRecordArray<T>(
  context: ValidationContext,
  value: unknown,
  path: string,
  maxLength: number,
  reader: (
    context: ValidationContext,
    record: Record<string, unknown>,
    path: string,
  ) => T,
) {
  if (!Array.isArray(value)) {
    addIssue(context, "INVALID_ARRAY", path);
    return [];
  }

  if (value.length > maxLength) {
    addIssue(context, "ARRAY_TOO_LARGE", path);
    return [];
  }

  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`;

    if (!isPlainObject(item)) {
      addIssue(context, "INVALID_OBJECT", itemPath);
      return {} as T;
    }

    return reader(context, item, itemPath);
  });
}

function validateAllowedKeys(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
  allowed: string[],
) {
  const allowedKeys = new Set(allowed);

  for (const key of Object.keys(record)) {
    const keyPath = path ? `${path}.${key}` : key;

    if (unsafeKeys.has(key)) {
      addIssue(context, "UNSAFE_KEY", keyPath);
      continue;
    }

    if (!allowedKeys.has(key)) {
      addIssue(context, "UNKNOWN_FIELD", keyPath);
    }
  }

  for (const key of allowed) {
    if (!Object.hasOwn(record, key)) {
      addIssue(context, "MISSING_FIELD", path ? `${path}.${key}` : key);
    }
  }
}

function readLiteral<T extends string | number>(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
  expected: T,
  code: string,
) {
  const value = getPathValue(record, path);

  if (value !== expected) {
    addIssue(context, code, path);
  }

  return expected;
}

function readString(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
) {
  const value = getPathValue(record, path);

  if (typeof value !== "string") {
    addIssue(context, "INVALID_STRING", path);
    return "";
  }

  return value;
}

function readNullableString(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
) {
  const value = getPathValue(record, path);

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    addIssue(context, "INVALID_STRING", path);
    return null;
  }

  return value;
}

function readBoolean(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
) {
  const value = getPathValue(record, path);

  if (typeof value !== "boolean") {
    addIssue(context, "INVALID_BOOLEAN", path);
    return false;
  }

  return value;
}

function readUuid(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
) {
  const value = readString(context, record, path);

  if (value && !uuidPattern.test(value)) {
    addIssue(context, "INVALID_UUID", path);
  }

  return value;
}

function readDate(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
) {
  const value = readString(context, record, path);
  return normalizeDate(context, value, path) ?? "";
}

function readNullableDate(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
) {
  const value = getPathValue(record, path);

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    addIssue(context, "INVALID_DATE", path);
    return null;
  }

  return normalizeDate(context, value, path);
}

function readEnum<T extends string>(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
  allowed: readonly T[] | Set<string>,
) {
  const value = readString(context, record, path);
  const isAllowed =
    allowed instanceof Set
      ? allowed.has(value)
      : allowed.includes(value as T);

  if (!isAllowed) {
    addIssue(context, "INVALID_ENUM", path);
  }

  return value as T;
}

function readNullableEnum(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
  allowed: Set<string>,
) {
  const value = getPathValue(record, path);

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    addIssue(context, "INVALID_ENUM", path);
    return null;
  }

  if (!allowed.has(value)) {
    addIssue(context, "INVALID_ENUM", path);
  }

  return value as BackupMessage["stopReason"];
}

function readInteger(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
  min: number,
  max = maxInteger,
): number {
  const value = getPathValue(record, path);

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    addIssue(context, "INVALID_INTEGER", path);
    return min;
  }

  return value;
}

function readNullableInteger(
  context: ValidationContext,
  record: Record<string, unknown>,
  path: string,
  min: number,
): number | null {
  const value = getPathValue(record, path);

  if (value === null) {
    return null;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > maxInteger
  ) {
    addIssue(context, "INVALID_INTEGER", path);
    return null;
  }

  return value;
}

function validateTrimmedLength(
  context: ValidationContext,
  value: string,
  path: string,
  min: number,
  max = Number.POSITIVE_INFINITY,
) {
  const length = value.trim().length;

  if (length < min || length > max) {
    addIssue(context, "INVALID_LENGTH", path);
  }
}

function normalizeDate(
  context: ValidationContext,
  value: string,
  path: string,
) {
  const time = Date.parse(value);

  if (!value || !isoDateTimePattern.test(value) || Number.isNaN(time)) {
    addIssue(context, "INVALID_DATE", path);
    return null;
  }

  return new Date(time).toISOString();
}

function checkUnique(
  context: ValidationContext,
  seen: Set<string>,
  value: string,
  path: string,
) {
  if (seen.has(value)) {
    addIssue(context, "DUPLICATE_ID", path);
    return;
  }

  seen.add(value);
}

function getPathValue(record: Record<string, unknown>, path: string) {
  const key = path.split(".").at(-1) ?? path;
  return record[key];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function addIssue(
  context: ValidationContext,
  code: string,
  path: string,
) {
  context.totalIssueCount += 1;

  if (context.issues.length >= maxReturnedIssues) {
    return;
  }

  context.issues.push({
    code,
    path,
  });
}

function toFailure(context: ValidationContext): BackupValidationFailure {
  return {
    valid: false,
    issues: context.issues,
    totalIssueCount: context.totalIssueCount,
  };
}
