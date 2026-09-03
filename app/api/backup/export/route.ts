import { NextResponse } from "next/server";
import { BackupService } from "@/server/backup/backup-service";
import { isCurrentSessionTestParticipant } from "@/server/auth/owner-context";

export const dynamic = "force-dynamic";

export async function GET() {
  if (await isCurrentSessionTestParticipant()) {
    return testParticipantForbidden();
  }

  try {
    const now = new Date();
    const backup = await new BackupService().exportBackup(now);

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${getBackupFilename(now)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to export backup." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          Pragma: "no-cache",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}

function getBackupFilename(date: Date) {
  return `berry-chat-backup-${date.toISOString().slice(0, 10)}.json`;
}

function testParticipantForbidden() {
  return NextResponse.json(
    { error: "Backup is not available for test participant sessions." },
    {
      status: 403,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
