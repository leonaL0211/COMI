import type { ChatModelKey } from "@/shared/chat-models";

const defaultSonnetModelId = "claude-sonnet-4-6";
const defaultOpusModelId = "claude-opus-4-6";

// GPT-5.6 Sol and Gemini 3.6 Flash go straight to OriginRouter under their
// own model id — verified in the AUDIT pass to need no alias. No env
// override for these two: the task scope explicitly excludes adding new
// env vars, unlike the Anthropic models below which predate this file.
const gptSolModelId = "gpt-5.6-sol";
const geminiFlashModelId = "gemini-3.6-flash";

export function resolveChatProviderModelId(model: ChatModelKey) {
  switch (model) {
    case "opus":
      return (
        process.env.CLAUDE_OPUS_MODEL_ID ??
        process.env.ORIGINROUTER_OPUS_MODEL_ID ??
        defaultOpusModelId
      );
    case "gpt-5.6-sol":
      return gptSolModelId;
    case "gemini-3.6-flash":
      return geminiFlashModelId;
    case "sonnet":
    default:
      return resolveDefaultChatProviderModelId();
  }
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
