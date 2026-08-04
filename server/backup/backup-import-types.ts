import type { BerryChatBackup } from "./backup-types";

export const backupImportErrorCodes = [
  "UNSUPPORTED_MEDIA_TYPE",
  "BACKUP_TOO_LARGE",
  "INVALID_JSON",
  "INVALID_BACKUP_FORMAT",
  "UNSUPPORTED_BACKUP_VERSION",
  "BACKUP_VALIDATION_FAILED",
  "BACKUP_CONFLICT",
  "BACKUP_IMPORT_FAILED",
  "BACKUP_SERVICE_UNAVAILABLE",
] as const;

export type BackupImportErrorCode = (typeof backupImportErrorCodes)[number];

export type BackupValidationIssue = {
  code: string;
  path: string;
};

export type BackupValidationFailure = {
  valid: false;
  issues: BackupValidationIssue[];
  totalIssueCount: number;
};

export type NormalizedBackup = BerryChatBackup;

export type EntityComparisonCounts = {
  incoming: number;
  insertable: number;
  identical: number;
  conflicts: number;
};

export type BackupPreviewWarning = {
  code: string;
  count: number;
};

export type BackupPreviewResult = {
  valid: true;
  format: "berry-chat-backup";
  version: 1;
  counts: {
    conversations: EntityComparisonCounts;
    messages: EntityComparisonCounts;
    summaries: EntityComparisonCounts;
    memories: EntityComparisonCounts;
  };
  warnings: BackupPreviewWarning[];
  conflictCount: number;
  canImport: boolean;
};

export type BackupImportEntityResult = {
  inserted: number;
  skipped: number;
};

export type BackupImportResult = {
  conversations: BackupImportEntityResult;
  messages: BackupImportEntityResult;
  summaries: BackupImportEntityResult;
  memories: BackupImportEntityResult;
};

export class BackupImportError extends Error {
  constructor(
    public readonly code: BackupImportErrorCode,
    public readonly status: number,
    message: string,
    public readonly validation?: BackupValidationFailure,
  ) {
    super(message);
    this.name = "BackupImportError";
  }
}
