"use client";

import { Popover } from "@/features/ui/Popover";
import { BackupExportButton } from "./BackupExportButton";

export function DataBackupPopover() {
  return (
    <Popover
      ariaLabel="数据与备份"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          className="ui-button ui-button-secondary w-full"
          type="button"
          aria-haspopup="menu"
        >
          数据与备份
        </button>
      )}
    >
      <div className="backup-popover-panel">
        <div className="backup-popover-copy">
          <p className="backup-popover-title">数据与备份</p>
          <p className="backup-popover-warning">
            备份文件包含私人聊天与长期记忆，请妥善保管。
          </p>
          <p className="backup-popover-help">
            将会导出当前所有会话、消息、摘要和长期记忆。
          </p>
        </div>
        <BackupExportButton />
      </div>
    </Popover>
  );
}
