import { BackupImportError } from "./backup-import-types";

const maxBackupRequestBytes = 10 * 1024 * 1024;

export async function readBackupJsonRequest(request: Request) {
  assertJsonContentType(request);
  assertContentLength(request);

  const body = await request.arrayBuffer();

  if (body.byteLength > maxBackupRequestBytes) {
    throw new BackupImportError(
      "BACKUP_TOO_LARGE",
      413,
      "Backup request is too large.",
    );
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new BackupImportError("INVALID_JSON", 400, "Invalid JSON.");
  }
}

function assertJsonContentType(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (
    !contentType
      .split(";")
      .map((part) => part.trim())
      .includes("application/json")
  ) {
    throw new BackupImportError(
      "UNSUPPORTED_MEDIA_TYPE",
      415,
      "Unsupported media type.",
    );
  }
}

function assertContentLength(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return;
  }

  const bytes = Number(contentLength);

  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    throw new BackupImportError("INVALID_JSON", 400, "Invalid request.");
  }

  if (bytes > maxBackupRequestBytes) {
    throw new BackupImportError(
      "BACKUP_TOO_LARGE",
      413,
      "Backup request is too large.",
    );
  }
}
