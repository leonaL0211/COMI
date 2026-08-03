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
import { AppShell } from "./AppShell";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";

export function ChatScreen() {
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [composerHeight, setComposerHeight] = useState(112);
  const composerRef = useRef<HTMLDivElement | null>(null);
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) {
      return;
    }

    void chat.sendMessage();
  }

  async function handleCreateConversation() {
    const created = await createConversation();

    if (created) {
      setIsSidebarOpen(false);
    }
  }

  function handleSelectConversation(conversationId: string) {
    selectConversation(conversationId);
    setIsSidebarOpen(false);
  }

  function handleOpenMemoryPanel() {
    setIsSidebarOpen(false);
    setIsMemoryPanelOpen(true);
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
      composerHeight={composerHeight}
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
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
          onClose={() => setIsSidebarOpen(false)}
        />
      }
      header={
        <ChatHeader
          title={currentConversationTitle}
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
      composer={
        <ChatComposer
          composerRef={composerRef}
          value={chat.input}
          isSending={chat.isSending}
          isDisabled={chat.isSending || chat.isLoadingMessages || isCreating}
          canSend={chat.canSend && !isCreating}
          onChange={chat.setInput}
          onSubmit={handleSubmit}
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
