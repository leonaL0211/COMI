import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/server/supabase/admin-client";
import { getSupabaseServerConfig } from "@/server/supabase/config";
import type { Database } from "@/server/supabase/database.types";
import type {
  BackupImportResult,
  NormalizedBackup,
} from "./backup-import-types";
import { BackupImportError } from "./backup-import-types";
import type { BackupImportRepository } from "./backup-import-repository";

export class SupabaseBackupImportRepository
  implements BackupImportRepository
{
  private readonly client: SupabaseClient<Database>;
  private readonly ownerId: string;

  constructor(client: SupabaseClient<Database> = getSupabaseAdminClient()) {
    this.client = client;
    this.ownerId = getSupabaseServerConfig().ownerId;
  }

  async importMerge(backup: NormalizedBackup): Promise<BackupImportResult> {
    const { data, error } = await this.client.rpc(
      "import_berry_chat_backup_v1",
      {
        p_owner_id: this.ownerId,
        p_payload: backup,
      },
    );

    if (error) {
      throw toBackupImportRepositoryError(error);
    }

    if (!isRpcImportResult(data)) {
      throw new BackupImportError(
        "BACKUP_IMPORT_FAILED",
        500,
        "Backup import failed.",
      );
    }

    return data;
  }
}

function isRpcImportResult(value: unknown): value is BackupImportResult {
  if (!isObject(value)) {
    return false;
  }

  return (
    isEntityResult(value.conversations) &&
    isEntityResult(value.messages) &&
    isEntityResult(value.summaries) &&
    isEntityResult(value.memories)
  );
}

function isEntityResult(value: unknown) {
  if (!isObject(value)) {
    return false;
  }

  const { inserted, skipped } = value;

  return (
    typeof inserted === "number" &&
    Number.isSafeInteger(inserted) &&
    inserted >= 0 &&
    typeof skipped === "number" &&
    Number.isSafeInteger(skipped) &&
    skipped >= 0
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toBackupImportRepositoryError(error: unknown) {
  const code = readErrorCode(error);

  if (code === "PBC01") {
    return new BackupImportError(
      "BACKUP_CONFLICT",
      409,
      "Backup import has conflicts.",
    );
  }

  if (code === "PBR01") {
    return new BackupImportError(
      "BACKUP_VALIDATION_FAILED",
      422,
      "Backup references are invalid.",
    );
  }

  if (code === "42883" || code === "PGRST202") {
    return new BackupImportError(
      "BACKUP_SERVICE_UNAVAILABLE",
      503,
      "Backup import service is unavailable.",
    );
  }

  return new BackupImportError(
    "BACKUP_IMPORT_FAILED",
    500,
    "Backup import failed.",
  );
}

function readErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}
