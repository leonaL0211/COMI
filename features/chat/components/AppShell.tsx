import type { CSSProperties, ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  header: ReactNode;
  messageList: ReactNode;
  composer: ReactNode;
  memoryPanel: ReactNode;
  composerHeight: number;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
};

export function AppShell({
  sidebar,
  header,
  messageList,
  composer,
  memoryPanel,
  composerHeight,
  isSidebarOpen,
  onCloseSidebar,
}: AppShellProps) {
  return (
    <main
      className="app-shell"
      style={
        {
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
        {composer}
      </section>
      {memoryPanel}
    </main>
  );
}
