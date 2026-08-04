"use client";

const BACKUP_EXPORT_URL = "/api/backup/export";
const BACKUP_PREVIEW_URL = "/api/backup/preview";
const BACKUP_IMPORT_URL = "/api/backup/import";
const FALLBACK_BACKUP_FILENAME_PREFIX = "berry-chat-backup";
export const MAX_BACKUP_FILE_BYTES = 10 * 1024 * 1024;

export type BackupExportResult =
  | {
      status: "ok";
      blob: Blob;
      filename: string;
    }
  | {
      status: "unauthorized";
    }
  | {
      status: "error";
    };

export async function requestBackupExport(): Promise<BackupExportResult> {
  const response = await fetch(BACKUP_EXPORT_URL, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  if (response.status === 401) {
    return { status: "unauthorized" };
  }

  if (!response.ok) {
    return { status: "error" };
  }

  const blob = await response.blob();
  const filename = getSafeBackupFilename(
    response.headers.get("Content-Disposition"),
  );

  return {
    status: "ok",
    blob,
    filename,
  };
}

export type BackupEntityCounts = {
  incoming: number;
  insertable: number;
  identical: number;
  conflicts: number;
};

export type BackupPreviewWarning = {
  code: string;
  count: number;
};

export type BackupValidationIssue = {
  code: string;
  path: string;
};

export type BackupPreviewSuccess = {
  valid: true;
  format: "berry-chat-backup";
  version: 1;
  counts: BackupEntityGroupCounts;
  warnings: BackupPreviewWarning[];
  conflictCount: number;
  canImport: boolean;
};

export type BackupPreviewFailure = {
  valid: false;
  issues: BackupValidationIssue[];
  totalIssueCount: number;
};

export type BackupEntityGroupCounts = {
  conversations: BackupEntityCounts;
  messages: BackupEntityCounts;
  summaries: BackupEntityCounts;
  memories: BackupEntityCounts;
};

export type BackupImportEntityResult = {
  inserted: number;
  skipped: number;
};

export type BackupImportSuccess = {
  imported: true;
  mode: "merge";
  result: {
    conversations: BackupImportEntityResult;
    messages: BackupImportEntityResult;
    summaries: BackupImportEntityResult;
    memories: BackupImportEntityResult;
  };
};

export type BackupApiResult<T> =
  | {
      status: "ok";
      data: T;
    }
  | {
      status: "unauthorized";
    }
  | {
      status: "validation";
      data: BackupPreviewFailure;
    }
  | {
      status: "error";
      message: string;
    };

export async function previewBackup(
  file: File,
): Promise<BackupApiResult<BackupPreviewSuccess>> {
  const backup = await readBackupFile(file);
  const response = await postBackupJson(BACKUP_PREVIEW_URL, backup);

  if (response.status === 401) {
    return { status: "unauthorized" };
  }

  const payload = await readJsonResponse(response);

  if (response.ok && isBackupPreviewSuccess(payload)) {
    return { status: "ok", data: payload };
  }

  if (response.status === 422 && isBackupPreviewFailure(payload)) {
    return { status: "validation", data: payload };
  }

  return {
    status: "error",
    message: getBackupErrorMessage(response.status),
  };
}

export async function importBackupMerge(
  file: File,
): Promise<BackupApiResult<BackupImportSuccess>> {
  const backup = await readBackupFile(file);
  const response = await postBackupJson(BACKUP_IMPORT_URL, {
    mode: "merge",
    backup,
  });

  if (response.status === 401) {
    return { status: "unauthorized" };
  }

  const payload = await readJsonResponse(response);

  if (response.ok && isBackupImportSuccess(payload)) {
    return { status: "ok", data: payload };
  }

  if (response.status === 422 && isBackupPreviewFailure(payload)) {
    return { status: "validation", data: payload };
  }

  return {
    status: "error",
    message: getBackupErrorMessage(response.status),
  };
}

export function validateBackupFileSelection(file: File) {
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    return "备份文件超过 10 MiB。";
  }

  const lowerName = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (!lowerName.endsWith(".json") && type !== "application/json") {
    return "请选择 Berry Chat JSON 备份文件。";
  }

  return null;
}

export function getSafeDisplayFilename(file: File) {
  return file.name.split(/[\\/]/).pop()?.trim() || "backup.json";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function getSafeBackupFilename(contentDisposition: string | null) {
  const fallback = `${FALLBACK_BACKUP_FILENAME_PREFIX}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  if (!contentDisposition) {
    return fallback;
  }

  const encodedMatch = contentDisposition.match(
    /filename\*=UTF-8''([^;\n\r]+)/i,
  );
  const quotedMatch = contentDisposition.match(/filename="([^"\n\r]+)"/i);
  const plainMatch = contentDisposition.match(/filename=([^;\n\r]+)/i);
  const rawFilename =
    encodedMatch?.[1] ?? quotedMatch?.[1] ?? plainMatch?.[1] ?? "";

  let decodedFilename = rawFilename.trim();

  try {
    decodedFilename = decodeURIComponent(decodedFilename);
  } catch {
    return fallback;
  }

  const filename = decodedFilename.split(/[\\/]/).pop()?.trim() ?? "";

  if (!/^[a-zA-Z0-9._-]+\.json$/.test(filename)) {
    return fallback;
  }

  return filename;
}

async function readBackupFile(file: File) {
  const fileError = validateBackupFileSelection(file);

  if (fileError) {
    throw new BackupFileError(fileError);
  }

  const body = await file.arrayBuffer();

  if (body.byteLength > MAX_BACKUP_FILE_BYTES) {
    throw new BackupFileError("备份文件超过 10 MiB。");
  }

  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new BackupFileError("备份文件不是有效的 UTF-8 JSON。");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BackupFileError("备份文件不是有效的 JSON。");
  }
}

async function postBackupJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readJsonResponse(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function getBackupErrorMessage(status: number) {
  switch (status) {
    case 409:
      return "备份与当前数据存在冲突，未恢复任何内容。";
    case 413:
      return "备份文件超过 10 MiB。";
    case 415:
      return "请选择 Berry Chat JSON 备份文件。";
    case 422:
      return "备份结构或引用无效。";
    case 500:
    case 503:
      return "备份恢复服务暂时不可用，请稍后再试。";
    default:
      return "备份处理失败，请稍后再试。";
  }
}

function isBackupPreviewSuccess(
  value: unknown,
): value is BackupPreviewSuccess {
  return (
    isRecord(value) &&
    value.valid === true &&
    value.format === "berry-chat-backup" &&
    value.version === 1 &&
    isEntityGroupCounts(value.counts) &&
    Array.isArray(value.warnings) &&
    value.warnings.every(isBackupWarning) &&
    typeof value.conflictCount === "number" &&
    typeof value.canImport === "boolean"
  );
}

function isBackupPreviewFailure(
  value: unknown,
): value is BackupPreviewFailure {
  return (
    isRecord(value) &&
    value.valid === false &&
    Array.isArray(value.issues) &&
    value.issues.every(isBackupIssue) &&
    typeof value.totalIssueCount === "number"
  );
}

function isBackupImportSuccess(value: unknown): value is BackupImportSuccess {
  return (
    isRecord(value) &&
    value.imported === true &&
    value.mode === "merge" &&
    isRecord(value.result) &&
    isImportEntityResult(value.result.conversations) &&
    isImportEntityResult(value.result.messages) &&
    isImportEntityResult(value.result.summaries) &&
    isImportEntityResult(value.result.memories)
  );
}

function isEntityGroupCounts(value: unknown): value is BackupEntityGroupCounts {
  return (
    isRecord(value) &&
    isEntityCounts(value.conversations) &&
    isEntityCounts(value.messages) &&
    isEntityCounts(value.summaries) &&
    isEntityCounts(value.memories)
  );
}

function isEntityCounts(value: unknown): value is BackupEntityCounts {
  return (
    isRecord(value) &&
    isSafeCount(value.incoming) &&
    isSafeCount(value.insertable) &&
    isSafeCount(value.identical) &&
    isSafeCount(value.conflicts)
  );
}

function isImportEntityResult(
  value: unknown,
): value is BackupImportEntityResult {
  return (
    isRecord(value) &&
    isSafeCount(value.inserted) &&
    isSafeCount(value.skipped)
  );
}

function isBackupWarning(value: unknown): value is BackupPreviewWarning {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    isSafeCount(value.count)
  );
}

function isBackupIssue(value: unknown): value is BackupValidationIssue {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.path === "string"
  );
}

function isSafeCount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export class BackupFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupFileError";
  }
}
