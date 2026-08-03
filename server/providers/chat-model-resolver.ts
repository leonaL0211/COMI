import type { ChatModelKey } from "@/shared/chat-models";

const defaultSonnetModelId = "claude-sonnet-4-6";
const defaultOpusModelId = "claude-opus-4-6";

export function resolveChatProviderModelId(model: ChatModelKey) {
  if (model === "opus") {
    return (
      process.env.CLAUDE_OPUS_MODEL_ID ??
      process.env.ORIGINROUTER_OPUS_MODEL_ID ??
      defaultOpusModelId
    );
  }

  return resolveDefaultChatProviderModelId();
}

export function resolveDefaultChatProviderModelId() {
  return (
    process.env.CLAUDE_SONNET_MODEL_ID ??
    process.env.ORIGINROUTER_SONNET_MODEL_ID ??
    process.env.CLAUDE_MODEL_ID ??
    process.env.ORIGINROUTER_MODEL_ID ??
    defaultSonnetModelId
  );
}
