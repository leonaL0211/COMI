import type {
  BackupImportResult,
  NormalizedBackup,
} from "./backup-import-types";

export interface BackupImportRepository {
  importMerge(backup: NormalizedBackup): Promise<BackupImportResult>;
}
