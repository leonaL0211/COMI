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
import type { ConversationSummary } from "@/features/conversations/types";
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

export function ChatScreen() {
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(76);
  const [composerHeight, setComposerHeight] = useState(56);
  const headerRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
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
    selectConversation,
    renameConversation,
    deleteConversation,
  } = conversations;
  const refreshConversationList = useCallback(
    () => refreshConversations({ keepCurrent: true }),
    [refreshConversations],
  );
  const chat = useChat({
    conversationId: currentConversationId,
    ensureConversation: createConversation,
    onConversationChanged: refreshConversationList,
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
        setComposerHeight(Math.ceil(entry.contentRect.height));
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

  async function handleCreateConversation() {
    setIsStickerPickerOpen(false);
    const created = await createConversation();

    if (created) {
      setIsSidebarOpen(false);
    }
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
      onCloseSidebar={handleCloseSidebar}
      sidebar={
        <ConversationSidebar
          conversations={conversationList}
          currentConversationId={currentConversationId}
          isLoading={isLoading}
          isCreating={isCreating}
          isInteractionDisabled={isConversationInteractionDisabled}
          error={error}
          onCreate={() => {
            void handleCreateConversation();
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
          selectedModel={selectedModel}
          selectedTheme={selectedTheme}
          isModelSelectorDisabled={chat.isSending}
          onSelectModel={setSelectedModel}
          onSelectTheme={setSelectedTheme}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenMemoryPanel={handleOpenMemoryPanel}
        />
      }
      messageList={
        <MessageList
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
          isStickerPickerOpen={isStickerPickerOpen}
          onChange={chat.setInput}
          onSubmit={handleSubmit}
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
    />
  );
}
