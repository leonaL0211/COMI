export type ChatModelKey = "sonnet" | "opus" | "gpt-5.6-sol" | "gemini-3.6-flash";

export type ChatModelProvider = "anthropic" | "openai" | "google";

/**
 * Single source of truth for every model COMI's chat can target.
 *
 * `provider` / `providerLabel` are product-facing identity metadata only —
 * every entry here is still served through the same OriginRouterProvider
 * (server/providers/originrouter-provider.ts). Adding a model does not mean
 * adding a provider class; it means adding a row here plus a resolver
 * branch in server/providers/chat-model-resolver.ts.
 *
 * - `label` is the full model name shown in the model picker's option list.
 * - `shortLabel` is the compact text shown in the always-visible composer
 *   pill (see ChatComposer.tsx) — keep this short, it renders in a fixed
 *   92px pill next to a "▼" indicator.
 */
export type ChatModelOption = {
  key: ChatModelKey;
  label: string;
  shortLabel: string;
  provider: ChatModelProvider;
  providerLabel: string;
  supportsVision: boolean;
};

export const DEFAULT_CHAT_MODEL: ChatModelKey = "sonnet";

export const CHAT_MODEL_OPTIONS: readonly ChatModelOption[] = [
  {
    key: "sonnet",
    label: "Claude Sonnet 4.6",
    shortLabel: "Claude",
    provider: "anthropic",
    providerLabel: "Anthropic",
    supportsVision: true,
  },
  {
    key: "opus",
    label: "Claude Opus 4.6",
    shortLabel: "Claude",
    provider: "anthropic",
    providerLabel: "Anthropic",
    supportsVision: true,
  },
  {
    key: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    shortLabel: "GPT",
    provider: "openai",
    providerLabel: "OpenAI",
    supportsVision: true,
  },
  {
    key: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    shortLabel: "Gemini",
    provider: "google",
    providerLabel: "Google",
    supportsVision: true,
  },
];

export function isChatModelKey(value: unknown): value is ChatModelKey {
  return CHAT_MODEL_OPTIONS.some((option) => option.key === value);
}

export function getChatModelOption(model: ChatModelKey): ChatModelOption {
  return (
    CHAT_MODEL_OPTIONS.find((option) => option.key === model) ??
    CHAT_MODEL_OPTIONS[0]
  );
}

export function getChatModelLabel(model: ChatModelKey) {
  return getChatModelOption(model).label;
}

export function getChatModelShortLabel(model: ChatModelKey) {
  return getChatModelOption(model).shortLabel;
}
