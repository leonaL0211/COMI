"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BackupFileError,
  formatFileSize,
  getSafeDisplayFilename,
  importBackupMerge,
  previewBackup,
  validateBackupFileSelection,
  type BackupImportSuccess,
  type BackupPreviewFailure,
  type BackupPreviewSuccess,
} from "./api";
import type { LegacyV1MigrationReport } from "./legacy-v1-types";
import { BackupImportResult } from "./BackupImportResult";
import {
  BackupPreviewSummary,
  BackupValidationIssues,
} from "./BackupPreviewSummary";

type PreviewState =
  | { status: "idle" }
  | {
      status: "valid";
      data: BackupPreviewSuccess;
      legacyReport: LegacyV1MigrationReport | null;
    }
  | { status: "invalid"; data: BackupPreviewFailure };

const emptyPreview: PreviewState = { status: "idle" };

export function BackupRestoreSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);
  const previewInFlightRef = useRef(false);
  const importInFlightRef = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>(emptyPreview);
  const [importResult, setImportResult] = useState<BackupImportSuccess | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const isBusy = isPreviewing || isImporting;
  const canImport = Boolean(
    selectedFile &&
      previewState.status === "valid" &&
      previewState.data.canImport &&
      isConfirmed &&
      !isBusy,
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setPreviewState(emptyPreview);
    setImportResult(null);
    setError(validateBackupFileSelection(file));
    setIsConfirmed(false);

    event.target.value = "";
  }

  async function handlePreview() {
    if (!selectedFile || isBusy || previewInFlightRef.current) {
      return;
    }

    const file = selectedFile;
    previewInFlightRef.current = true;
    setIsPreviewing(true);
    setError(null);
    setPreviewState(emptyPreview);
    setImportResult(null);
    setIsConfirmed(false);

    try {
      const result = await previewBackup(file);

      if (!isMountedRef.current) {
        return;
      }

      if (result.status === "unauthorized") {
        router.replace("/login?next=/");
        return;
      }

      if (result.status === "validation") {
        setPreviewState({ status: "invalid", data: result.data });
        return;
      }

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setPreviewState({
        status: "valid",
        data: result.data,
        legacyReport: result.legacyReport ?? null,
      });
    } catch (caughtError) {
      if (isMountedRef.current) {
        setError(getClientErrorMessage(caughtError));
      }
    } finally {
      previewInFlightRef.current = false;

      if (isMountedRef.current) {
        setIsPreviewing(false);
      }
    }
  }

  async function handleImport() {
    if (!selectedFile || !canImport || importInFlightRef.current) {
      return;
    }

    const file = selectedFile;
    importInFlightRef.current = true;
    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const result = await importBackupMerge(file);

      if (!isMountedRef.current) {
        return;
      }

      if (result.status === "unauthorized") {
        router.replace("/login?next=/");
        return;
      }

      if (result.status === "validation") {
        setPreviewState({ status: "invalid", data: result.data });
        return;
      }

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setImportResult(result.data);
    } catch (caughtError) {
      if (isMountedRef.current) {
        setError(getClientErrorMessage(caughtError));
      }
    } finally {
      importInFlightRef.current = false;

      if (isMountedRef.current) {
        setIsImporting(false);
      }
    }
  }

  return (
    <section className="backup-section backup-restore-section">
      <div className="backup-section-copy">
        <p className="backup-section-title">恢复备份</p>
        <p className="backup-popover-help">
          选择 Berry Chat v2 导出的 JSON 文件，或旧版 Berry Chat v1 JSON 数据。恢复只会合并缺失数据，不会覆盖或删除当前内容。
        </p>
      </div>

      <p className="backup-merge-notice">
        恢复不会覆盖或删除现有数据。相同记录会跳过，发现同 ID 内容冲突时将拒绝整次恢复。
      </p>

      <input
        ref={inputRef}
        className="backup-file-input"
        type="file"
        accept=".json,application/json"
        disabled={isBusy}
        onChange={handleFileChange}
      />
      <button
        className="ui-button ui-button-secondary w-full"
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
      >
        选择备份文件
      </button>

      {selectedFile ? (
        <div className="backup-file-card">
          <p className="backup-file-name">
            {getSafeDisplayFilename(selectedFile)}
          </p>
          <p className="backup-muted">{formatFileSize(selectedFile.size)}</p>
        </div>
      ) : null}

      <button
        className="ui-button ui-button-primary w-full"
        type="button"
        disabled={!selectedFile || isBusy || Boolean(error)}
        onClick={handlePreview}
      >
        {isPreviewing ? "正在检查..." : "检查备份"}
      </button>

      {error ? <p className="backup-error">{error}</p> : null}

      {previewState.status === "valid" ? (
        <BackupPreviewSummary
          preview={previewState.data}
          legacyReport={previewState.legacyReport}
        />
      ) : null}
      {previewState.status === "invalid" ? (
        <BackupValidationIssues
          issues={previewState.data.issues}
          totalIssueCount={previewState.data.totalIssueCount}
        />
      ) : null}

      {previewState.status === "valid" && previewState.data.canImport ? (
        <div className="backup-confirm-card">
          <p className="backup-section-title">确认合并恢复</p>
          <p className="backup-popover-help">
            合并模式不会覆盖、不会删除。若恢复期间发现冲突，整次恢复会被拒绝。
          </p>
          <label className="backup-confirm-label">
            <input
              type="checkbox"
              checked={isConfirmed}
              disabled={isBusy}
              onChange={(event) => setIsConfirmed(event.target.checked)}
            />
            <span>
              我确认以合并模式迁移，不覆盖或删除当前数据。
            </span>
          </label>
          <button
            className="ui-button ui-button-primary w-full"
            type="button"
            disabled={!canImport}
            onClick={handleImport}
          >
            {isImporting ? "正在恢复..." : "确认合并恢复"}
          </button>
        </div>
      ) : null}

      {importResult ? <BackupImportResult result={importResult} /> : null}
    </section>
  );
}

function getClientErrorMessage(error: unknown) {
  if (error instanceof BackupFileError) {
    return error.message;
  }

  return "备份处理失败，请稍后再试。";
}
