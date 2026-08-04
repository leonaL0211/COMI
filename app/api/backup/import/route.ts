import { NextResponse } from "next/server";
import { BackupImportService } from "@/server/backup/backup-import-service";
import { BackupImportError } from "@/server/backup/backup-import-types";
import { readBackupJsonRequest } from "@/server/backup/backup-request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readBackupJsonRequest(request);
    const backup = readMergeImportRequest(body);
    const result = await new BackupImportService().importMerge(backup);

    return noStoreJson(
      {
        imported: true,
        mode: "merge",
        result,
      },
      200,
    );
  } catch (error) {
    return toBackupErrorResponse(error);
  }
}

function readMergeImportRequest(input: unknown) {
  if (!isPlainObject(input)) {
    throw new BackupImportError("INVALID_JSON", 400, "Invalid request.");
  }

  validateAllowedKeys(input, ["mode", "backup"]);

  if (input.mode !== "merge") {
    throw new BackupImportError("INVALID_JSON", 400, "Invalid import mode.");
  }

  if (!Object.hasOwn(input, "backup")) {
    throw new BackupImportError("INVALID_JSON", 400, "Invalid request.");
  }

  return input.backup;
}

function validateAllowedKeys(
  input: Record<string, unknown>,
  allowed: string[],
) {
  const allowedKeys = new Set(allowed);

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new BackupImportError("INVALID_JSON", 400, "Invalid request.");
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function toBackupErrorResponse(error: unknown) {
  if (error instanceof BackupImportError) {
    if (error.validation) {
      return noStoreJson(error.validation, error.status);
    }

    return noStoreJson({ error: getErrorMessage(error) }, error.status);
  }

  return noStoreJson({ error: "Unable to import backup." }, 500);
}

function getErrorMessage(error: BackupImportError) {
  switch (error.code) {
    case "UNSUPPORTED_MEDIA_TYPE":
      return "Unsupported media type.";
    case "BACKUP_TOO_LARGE":
      return "Backup file is too large.";
    case "INVALID_JSON":
      return "Invalid backup import request.";
    case "BACKUP_CONFLICT":
      return "Backup contains conflicts.";
    case "BACKUP_SERVICE_UNAVAILABLE":
      return "Backup service is unavailable.";
    default:
      return "Unable to import backup.";
  }
}

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
