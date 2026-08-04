import { NextResponse } from "next/server";
import { BackupImportService } from "@/server/backup/backup-import-service";
import { BackupImportError } from "@/server/backup/backup-import-types";
import { readBackupJsonRequest } from "@/server/backup/backup-request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const backup = await readBackupJsonRequest(request);
    const preview = await new BackupImportService().preview(backup);

    return noStoreJson(preview, 200);
  } catch (error) {
    return toBackupErrorResponse(error);
  }
}

function toBackupErrorResponse(error: unknown) {
  if (error instanceof BackupImportError) {
    if (error.validation) {
      return noStoreJson(error.validation, error.status);
    }

    return noStoreJson({ error: getErrorMessage(error) }, error.status);
  }

  return noStoreJson({ error: "Unable to preview backup." }, 500);
}

function getErrorMessage(error: BackupImportError) {
  switch (error.code) {
    case "UNSUPPORTED_MEDIA_TYPE":
      return "Unsupported media type.";
    case "BACKUP_TOO_LARGE":
      return "Backup file is too large.";
    case "INVALID_JSON":
      return "Invalid JSON.";
    case "BACKUP_CONFLICT":
      return "Backup contains conflicts.";
    case "BACKUP_SERVICE_UNAVAILABLE":
      return "Backup service is unavailable.";
    default:
      return "Invalid backup.";
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
