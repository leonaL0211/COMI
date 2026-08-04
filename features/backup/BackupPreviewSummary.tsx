"use client";

import type {
  BackupEntityCounts,
  BackupPreviewSuccess,
  BackupPreviewWarning,
  BackupValidationIssue,
} from "./api";
import type { LegacyV1MigrationReport } from "./legacy-v1-types";

type BackupPreviewSummaryProps = {
  preview: BackupPreviewSuccess;
  legacyReport?: LegacyV1MigrationReport | null;
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

export function BackupPreviewSummary({
  preview,
  legacyReport,
}: BackupPreviewSummaryProps) {
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
      {legacyReport ? <LegacyMigrationSummary report={legacyReport} /> : null}
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

function LegacyMigrationSummary({
  report,
}: {
  report: LegacyV1MigrationReport;
}) {
  return (
    <div className="backup-legacy-card">
      <p className="backup-preview-status">
        已识别为旧版 Berry Chat v1 数据，将转换后合并到当前空间。
      </p>
      <p className="backup-popover-warning">
        旧版图片消息目前无法迁移；消息中的文字仍会保留。
      </p>
      <div className="backup-legacy-grid">
        <span>会话 {report.conversations}</span>
        <span>消息 {report.messages}</span>
        <span>长期记忆 {report.memories}</span>
        <span>摘要 {report.summaries}</span>
        <span>表情包引用 {report.migratedStickers}</span>
        <span>跳过图片 {report.skippedImages}</span>
      </div>
      {report.skippedMessages > 0 ||
      report.ignoredToolUsageMessages > 0 ||
      report.warnings.length > 0 ? (
        <div className="backup-warning-list">
          {report.skippedMessages > 0 ? (
            <p>跳过 {report.skippedMessages} 条无法迁移的空消息。</p>
          ) : null}
          {report.ignoredToolUsageMessages > 0 ? (
            <p>
              忽略 {report.ignoredToolUsageMessages} 条旧版工具元数据。
            </p>
          ) : null}
          {report.warnings.map((warning) => (
            <p key={warning.code}>
              {getLegacyWarningLabel(warning.code, warning.count)}
            </p>
          ))}
        </div>
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

function getLegacyWarningLabel(code: string, count: number) {
  switch (code) {
    case "MESSAGE_TIMESTAMPS_APPROXIMATED":
      return `有 ${count} 个旧版会话的消息时间已按顺序近似生成。`;
    case "IMAGES_SKIPPED":
      return `跳过 ${count} 张旧版图片，未上传到服务端。`;
    case "UNKNOWN_STICKER":
      return `发现 ${count} 个未知表情包引用，已按安全规则忽略。`;
    case "SUMMARY_SKIPPED":
      return `有 ${count} 份旧版摘要因 checkpoint 无法确认而未迁移。`;
    case "TITLE_TRUNCATED":
      return `有 ${count} 个旧版标题过长，已截断到 160 字。`;
    case "MEMORY_SKIPPED_EMPTY":
      return `跳过 ${count} 条空的旧版长期记忆。`;
    case "MEMORY_SKIPPED_TOO_LONG":
      return `跳过 ${count} 条超过长度上限的旧版长期记忆。`;
    case "TOOL_USAGE_IGNORED":
      return `忽略 ${count} 条旧版工具元数据。`;
    case "MESSAGE_SKIPPED_INVALID_ROLE":
      return `跳过 ${count} 条角色无效的旧版消息。`;
    case "MESSAGE_SKIPPED_EMPTY_AFTER_MIGRATION":
      return `跳过 ${count} 条图片之外没有可迁移内容的旧版消息。`;
    default:
      return `旧版迁移提示 ${code}: ${count}`;
  }
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
