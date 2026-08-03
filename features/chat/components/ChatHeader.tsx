type ChatHeaderProps = {
  title: string;
  onOpenSidebar: () => void;
  onOpenMemoryPanel: () => void;
};

export function ChatHeader({
  title,
  onOpenSidebar,
  onOpenMemoryPanel,
}: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <div className="chat-header-inner">
        <button
          className="mobile-sidebar-trigger"
          type="button"
          aria-label="打开会话列表"
          onClick={onOpenSidebar}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="chat-header-kicker">Berry Chat v2</p>
          <h1 className="truncate text-base font-semibold leading-6 text-[var(--foreground)]">
            {title}
          </h1>
        </div>
        <button
          className="ui-button ui-button-secondary min-h-10"
          type="button"
          onClick={onOpenMemoryPanel}
        >
          长期记忆
        </button>
      </div>
    </header>
  );
}
