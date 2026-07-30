"use client";

import { FormEvent, useCallback } from "react";
import { ConversationSidebar } from "@/features/conversations/components/ConversationSidebar";
import { useConversations } from "@/features/conversations/hooks/useConversations";
import type { ConversationSummary } from "@/features/conversations/types";
import { useChat } from "../hooks/useChat";

export function ChatScreen() {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) {
      return;
    }

    void chat.sendMessage();
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

    await deleteConversation(conversation.id);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Berry Chat v2</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Phase 2C multi-conversation persistence test.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <ConversationSidebar
          conversations={conversationList}
          currentConversationId={currentConversationId}
          isLoading={isLoading}
          isCreating={isCreating}
          isInteractionDisabled={isConversationInteractionDisabled}
          error={error}
          onCreate={() => {
            void createConversation();
          }}
          onSelect={selectConversation}
          onRename={(conversation) => {
            void handleRename(conversation);
          }}
          onDelete={(conversation) => {
            void handleDelete(conversation);
          }}
        />

        <section className="flex min-h-0 flex-1 flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
          {chat.isLoadingMessages ? (
            <p className="text-sm text-zinc-500">Loading messages...</p>
          ) : chat.messages.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Send a message or create a conversation.
            </p>
          ) : (
            chat.messages.map((message) => (
              <article
                key={message.id}
                className="rounded border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="mb-1 text-xs font-semibold uppercase text-zinc-500">
                  {message.role}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-900">
                  {message.content}
                </p>
                {message.status === "pending" ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    This reply has not been saved yet.
                  </p>
                ) : null}
                {message.stopReason === "max_tokens" ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Reply reached the output length limit.
                  </p>
                ) : null}
              </article>
            ))
          )}
          {chat.error ? (
            <p className="text-sm text-red-600">{chat.error}</p>
          ) : null}
        </section>
      </div>

      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <label className="text-sm font-medium" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          className="min-h-28 resize-y rounded border border-zinc-300 p-3 text-sm outline-none focus:border-zinc-500"
          value={chat.input}
          onChange={(event) => chat.setInput(event.target.value)}
          placeholder="Type a message..."
          disabled={chat.isSending || chat.isLoadingMessages || isCreating}
        />
        <button
          className="self-end rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          type="submit"
          disabled={!chat.canSend || isCreating}
        >
          {chat.isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}
