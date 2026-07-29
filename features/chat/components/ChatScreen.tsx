"use client";

import { FormEvent } from "react";
import { useChat } from "../hooks/useChat";

export function ChatScreen() {
  const { messages, input, setInput, isSending, error, canSend, sendMessage } =
    useChat();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Berry Chat v2</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Phase 1 minimal non-streaming chat test.
        </p>
      </header>

      <section className="flex min-h-0 flex-1 flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">Send a message to test chat.</p>
        ) : (
          messages.map((message) => (
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
              {message.stopReason === "max_tokens" ? (
                <p className="mt-2 text-xs text-amber-700">
                  Reply reached the output length limit.
                </p>
              ) : null}
            </article>
          ))
        )}

        {isSending ? (
          <p className="text-sm text-zinc-500">Waiting for reply...</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </section>

      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <label className="text-sm font-medium" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          className="min-h-28 resize-y rounded border border-zinc-300 p-3 text-sm outline-none focus:border-zinc-500"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
        />
        <button
          className="self-end rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          type="submit"
          disabled={!canSend}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}
