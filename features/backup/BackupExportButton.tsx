"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestBackupExport } from "./api";

export function BackupExportButton() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setMessage(null);

    try {
      const result = await requestBackupExport();

      if (result.status === "unauthorized") {
        setMessage("登录状态已失效，请重新登录。");
        router.replace("/login?next=/");
        return;
      }

      if (result.status === "error") {
        setMessage("备份导出失败，请稍后再试。");
        return;
      }

      downloadBlob(result.blob, result.filename);
      setMessage("备份文件已开始下载。");
    } catch {
      setMessage("备份导出失败，请稍后再试。");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="backup-export-control">
      <button
        className="ui-button ui-button-primary w-full"
        type="button"
        disabled={isExporting}
        onClick={handleExport}
      >
        {isExporting ? "正在导出..." : "导出完整备份"}
      </button>
      {message ? <p className="backup-export-status">{message}</p> : null}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 0);
}
