"use client";

import type { FormEvent, Ref } from "react";

type ChatComposerProps = {
  value: string;
  isSending: boolean;
  isDisabled: boolean;
  canSend: boolean;
  composerRef: Ref<HTMLDivElement>;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ChatComposer({
  value,
  isSending,
  isDisabled,
  canSend,
  composerRef,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  return (
    <div ref={composerRef} className="chat-composer-shell">
      <form className="chat-composer" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="chat-input">
          消息
        </label>
        <textarea
          id="chat-input"
          className="chat-composer-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="说点什么..."
          disabled={isDisabled}
          rows={3}
          aria-label="消息"
        />
        <button
          className="chat-send-button"
          type="submit"
          disabled={!canSend}
        >
          {isSending ? "发送中" : "发送"}
        </button>
      </form>
    </div>
  );
}
