"use client";

const BACKUP_EXPORT_URL = "/api/backup/export";
const FALLBACK_BACKUP_FILENAME_PREFIX = "berry-chat-backup";

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
