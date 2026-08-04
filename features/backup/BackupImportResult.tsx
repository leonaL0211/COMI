"use client";

import type { BackupImportSuccess } from "./api";

type BackupImportResultProps = {
  result: BackupImportSuccess;
};

const labels = {
  conversations: "会话",
  messages: "消息",
  summaries: "摘要",
  memories: "长期记忆",
} as const;

export function BackupImportResult({ result }: BackupImportResultProps) {
  const rows = [
    ["conversations", result.result.conversations],
    ["messages", result.result.messages],
    ["summaries", result.result.summaries],
    ["memories", result.result.memories],
  ] as const;
  const insertedTotal = rows.reduce((sum, [, row]) => sum + row.inserted, 0);

  return (
    <div className="backup-preview-card backup-import-result">
      <p className="backup-preview-status">
        备份恢复完成。现有内容未被覆盖或删除。
      </p>
      {insertedTotal === 0 ? (
        <p className="backup-muted">
          备份中的数据已全部存在，没有新增内容。
        </p>
      ) : null}
      <div className="backup-result-list">
        {rows.map(([key, row]) => (
          <p key={key}>
            {labels[key]}：新增 {row.inserted}，跳过 {row.skipped}
          </p>
        ))}
      </div>
      <button
        className="ui-button ui-button-secondary w-full"
        type="button"
        onClick={() => window.location.reload()}
      >
        刷新查看恢复结果
      </button>
    </div>
  );
}
