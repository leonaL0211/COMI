"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ConversationSidebar } from "@/features/conversations/components/ConversationSidebar";
import { useConversations } from "@/features/conversations/hooks/useConversations";
import { MemoryPanel } from "@/features/memory/components/MemoryPanel";
import {
  MemoryToast,
  type MemoryToastState,
} from "@/features/memory/components/MemoryToast";
import type { ConversationSummary } from "@/features/conversations/types";
import type { MemoryExtractionStatus } from "../types";
import { useChat } from "../hooks/useChat";
import { useModelPreference } from "../hooks/useModelPreference";
import { useThemePreference } from "../hooks/useThemePreference";
import {
  createStickerToken,
  type StickerId,
} from "@/shared/stickers/sticker-catalog";
import { AppShell } from "./AppShell";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ClawdCompanion } from "./ClawdCompanion";
import { MessageList } from "./MessageList";
import { ThemeModeToggle } from "./ThemeModeToggle";

export function ChatScreen({
  isTestParticipant,
}: {
  isTestParticipant: boolean;
}) {
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(76);
  const [composerHeight, setComposerHeight] = useState(56);
  const [memoryToast, setMemoryToast] = useState<MemoryToastState | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const memoryToastIdRef = useRef(0);
  const { selectedModel, setSelectedModel } = useModelPreference();
  const { selectedTheme, setSelectedTheme } = useThemePreference();
  const conversations = useConversations();
  const {
    conversations: conversationList,
    currentConversationId,
    isLoading,
    isCreating,
    error,
    refreshConversations,
    createConversation,
    startNewConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
  } = conversations;
  const refreshConversationList = useCallback(
    () => refreshConversations({ keepCurrent: true }),
    [refreshConversations],
  );
  const handleMemoryExtracted = useCallback(
    (status: MemoryExtractionStatus) => {
      if (status !== "created" && status !== "updated") {
        return;
      }

      memoryToastIdRef.current += 1;
      setMemoryToast({
        id: memoryToastIdRef.current,
        message:
          status === "created"
            ? "COMI 记住了一件关于你的事"
            : "关于你的理解更新了",
      });
    },
    [],
  );
  const chat = useChat({
    conversationId: currentConversationId,
    ensureConversation: createConversation,
    onConversationChanged: refreshConversationList,
    onMemoryExtracted: handleMemoryExtracted,
  });
  const isConversationInteractionDisabled = chat.isSending || isCreating;
  const currentConversationTitle = useMemo(
    () =>
      conversationList.find(
        (conversation) => conversation.id === currentConversationId,
      )?.title ?? "新对话",
    [conversationList, currentConversationId],
  );

  useEffect(() => {
    const composer = composerRef.current;

    if (!composer || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setComposerHeight(Math.ceil(composer.getBoundingClientRect().height));
      }
    });

    observer.observe(composer);
    setComposerHeight(Math.ceil(composer.getBoundingClientRect().height));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const header = headerRef.current;

    if (!header || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setHeaderHeight(Math.ceil(entry.contentRect.height));
      }
    });

    observer.observe(header);
    setHeaderHeight(Math.ceil(header.getBoundingClientRect().height));

    return () => observer.disconnect();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) {
      return;
    }

    setIsStickerPickerOpen(false);
    void chat.sendMessage(selectedModel);
  }

  function handleCreateConversation() {
    setIsStickerPickerOpen(false);
    startNewConversation();
    setIsSidebarOpen(false);
  }

  function handleSelectConversation(conversationId: string) {
    setIsStickerPickerOpen(false);
    selectConversation(conversationId);
    setIsSidebarOpen(false);
  }

  function handleCloseSidebar() {
    setIsSidebarOpen(false);
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(".mobile-sidebar-trigger")
        ?.focus();
    });
  }

  function handleOpenMemoryPanel() {
    setIsSidebarOpen(false);
    setIsStickerPickerOpen(false);
    setIsMemoryPanelOpen(true);
  }

  function handleSendSticker(stickerId: StickerId) {
    if (chat.isSending || chat.isLoadingMessages || isCreating) {
      return;
    }

    setIsStickerPickerOpen(false);
    void chat.sendMessage(selectedModel, createStickerToken(stickerId));
  }

  async function handleRename(conversation: ConversationSummary) {
    const nextTitle = window.prompt("Rename conversation", conversation.title);

    if (nextTitle === null) {
      return;
    }

    await renameConversation(conversation.id, nextTitle);
  }

  async function handleDelete(conversation: ConversationSummary) {
    const confirmed = window.confirm(
      `Delete "${conversation.title}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const deleted = await deleteConversation(conversation.id);

    if (deleted) {
      setIsSidebarOpen(false);
    }
  }

  return (
    <AppShell
      headerHeight={headerHeight}
      composerHeight={composerHeight}
      isSidebarOpen={isSidebarOpen}
      isHomeState={!chat.isLoadingMessages && chat.messages.length === 0}
      onCloseSidebar={handleCloseSidebar}
      sidebar={
        <ConversationSidebar
          conversations={conversationList}
          currentConversationId={currentConversationId}
          isLoading={isLoading}
          isCreating={isCreating}
          isInteractionDisabled={isConversationInteractionDisabled}
          error={error}
          isTestParticipant={isTestParticipant}
          onCreate={() => {
            handleCreateConversation();
          }}
          onSelect={handleSelectConversation}
          onRename={(conversation) => {
            void handleRename(conversation);
          }}
          onDelete={(conversation) => {
            void handleDelete(conversation);
          }}
          onClose={handleCloseSidebar}
        />
      }
      header={
        <ChatHeader
          headerRef={headerRef}
          title={currentConversationTitle}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenMemoryPanel={handleOpenMemoryPanel}
        />
      }
      messageList={
        <MessageList
          conversationId={currentConversationId}
          messages={chat.messages}
          isLoading={chat.isLoadingMessages}
          error={chat.error}
        />
      }
      clawd={
        <ClawdCompanion
          mode={
            chat.isSending
              ? "typing"
              : chat.isLoadingMessages
                ? "reading"
                : "idle"
          }
          headerHeight={headerHeight}
          composerHeight={composerHeight}
        />
      }
      composer={
        <ChatComposer
          composerRef={composerRef}
          value={chat.input}
          isSending={chat.isSending}
          isDisabled={chat.isSending || chat.isLoadingMessages || isCreating}
          canSend={chat.canSend && !isCreating}
          selectedModel={selectedModel}
          isModelSelectorDisabled={chat.isSending}
          isStickerPickerOpen={isStickerPickerOpen}
          onChange={chat.setInput}
          onSubmit={handleSubmit}
          onSelectModel={setSelectedModel}
          onToggleStickerPicker={() =>
            setIsStickerPickerOpen((isOpen) => !isOpen)
          }
          onCloseStickerPicker={() => setIsStickerPickerOpen(false)}
          onSendSticker={handleSendSticker}
        />
      }
      memoryPanel={
        <MemoryPanel
          isOpen={isMemoryPanelOpen}
          onClose={() => setIsMemoryPanelOpen(false)}
        />
      }
      memoryToast={
        <MemoryToast
          toast={memoryToast}
          onDismiss={() => setMemoryToast(null)}
        />
      }
      themeToggle={
        <ThemeModeToggle
          selectedTheme={selectedTheme}
          onSelectTheme={setSelectedTheme}
        />
      }
    />
  );
}
