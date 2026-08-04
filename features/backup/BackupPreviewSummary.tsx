"use client";

import type {
  BackupEntityCounts,
  BackupPreviewSuccess,
  BackupPreviewWarning,
  BackupValidationIssue,
} from "./api";

type BackupPreviewSummaryProps = {
  preview: BackupPreviewSuccess;
};

type BackupValidationIssuesProps = {
  issues: BackupValidationIssue[];
  totalIssueCount: number;
};

const labels = {
  conversations: "会话",
  messages: "消息",
  summaries: "摘要",
  memories: "长期记忆",
} as const;

export function BackupPreviewSummary({ preview }: BackupPreviewSummaryProps) {
  const totalInsertable = Object.values(preview.counts).reduce(
    (sum, counts) => sum + counts.insertable,
    0,
  );
  const statusText =
    preview.conflictCount > 0
      ? "发现内容冲突，无法恢复。当前数据不会被覆盖或修改。"
      : totalInsertable > 0
        ? "检查通过，可以安全合并恢复。"
        : "检查通过。备份中的数据已全部存在，恢复时会安全跳过。";

  return (
    <div className="backup-preview-card">
      <p className="backup-preview-status">{statusText}</p>
      <div className="backup-count-grid">
        {renderCountRow("conversations", preview.counts.conversations)}
        {renderCountRow("messages", preview.counts.messages)}
        {renderCountRow("summaries", preview.counts.summaries)}
        {renderCountRow("memories", preview.counts.memories)}
      </div>
      {preview.warnings.length > 0 ? (
        <BackupWarnings warnings={preview.warnings} />
      ) : null}
    </div>
  );
}

export function BackupValidationIssues({
  issues,
  totalIssueCount,
}: BackupValidationIssuesProps) {
  return (
    <div className="backup-preview-card">
      <p className="backup-preview-status">备份检查未通过。</p>
      <ul className="backup-issue-list">
        {issues.slice(0, 8).map((issue, index) => (
          <li key={`${issue.path}-${issue.code}-${index}`}>
            <span>{getIssueLabel(issue.code)}</span>
            <code>{issue.path || "backup"}</code>
          </li>
        ))}
      </ul>
      {totalIssueCount > issues.length ? (
        <p className="backup-muted">
          共 {totalIssueCount} 个问题，仅显示前 {issues.length} 项。
        </p>
      ) : null}
    </div>
  );
}

function BackupWarnings({ warnings }: { warnings: BackupPreviewWarning[] }) {
  return (
    <div className="backup-warning-list">
      {warnings.map((warning) => (
        <p key={warning.code}>
          {getWarningLabel(warning.code, warning.count)}
        </p>
      ))}
    </div>
  );
}

function renderCountRow(
  key: keyof typeof labels,
  counts: BackupEntityCounts,
) {
  return (
    <div key={key} className="backup-count-row">
      <span className="backup-count-label">{labels[key]}</span>
      <span>备份中 {counts.incoming}</span>
      <span>将新增 {counts.insertable}</span>
      <span>已存在 {counts.identical}</span>
      <span>冲突 {counts.conflicts}</span>
    </div>
  );
}

function getWarningLabel(code: string, count: number) {
  if (code === "MEMORY_DUPLICATE_CONTENT") {
    return `发现 ${count} 条内容相同但 ID 不同的长期记忆。恢复不会自动去重。`;
  }

  return `发现 ${count} 条备份提示：${code}`;
}

function getIssueLabel(code: string) {
  switch (code) {
    case "INVALID_UUID":
      return "ID 格式无效";
    case "INVALID_REFERENCE":
      return "引用不存在";
    case "INVALID_CHECKPOINT":
      return "摘要 checkpoint 不匹配";
    case "DUPLICATE_ID":
      return "存在重复 ID";
    case "UNKNOWN_FIELD":
      return "包含不支持的字段";
    case "UNSAFE_KEY":
      return "包含不安全字段";
    case "INVALID_DATE":
      return "时间格式无效";
    case "INVALID_ENUM":
      return "枚举值无效";
    case "INVALID_LENGTH":
      return "字段长度无效";
    default:
      return code;
  }
}
