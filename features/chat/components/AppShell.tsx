"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  header: ReactNode;
  messageList: ReactNode;
  clawd: ReactNode;
  composer: ReactNode;
  memoryPanel: ReactNode;
  headerHeight: number;
  composerHeight: number;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
};

export function AppShell({
  sidebar,
  header,
  messageList,
  clawd,
  composer,
  memoryPanel,
  headerHeight,
  composerHeight,
  isSidebarOpen,
  onCloseSidebar,
}: AppShellProps) {
  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const closeButton = document.querySelector<HTMLButtonElement>(
      ".mobile-sidebar-close",
    );
    closeButton?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseSidebar();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen, onCloseSidebar]);

  return (
    <main
      className="app-shell"
      style={
        {
          "--header-height": `${headerHeight}px`,
          "--composer-height": `${composerHeight}px`,
        } as CSSProperties
      }
    >
      <button
        type="button"
        className={[
          "mobile-sidebar-backdrop",
          isSidebarOpen ? "mobile-sidebar-backdrop-open" : "",
        ].join(" ")}
        aria-label="关闭会话列表"
        onClick={onCloseSidebar}
      />
      <div
        className={[
          "mobile-sidebar-panel",
          isSidebarOpen ? "mobile-sidebar-panel-open" : "",
        ].join(" ")}
      >
        {sidebar}
      </div>
      <section className="chat-main" aria-label="Berry Chat">
        {header}
        {messageList}
        {clawd}
        {composer}
      </section>
      {memoryPanel}
    </main>
  );
}
