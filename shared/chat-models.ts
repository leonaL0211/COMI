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
 * - `avatarSrc` is a static file under public/model-avatars/, provided by
 *   the product owner. Filenames intentionally follow the OriginRouter
 *   model id, not the registry `key` — that's why Sonnet/Opus map to
 *   `claude-sonnet-4-6.png` / `claude-opus-4-6.png` below instead of
 *   reusing their `key`.
 * - `providerModelId` is the literal id OriginRouter returns and
 *   PersistentChatService stores in `messages.model` for every assistant
 *   reply (see server/providers/chat-model-resolver.ts's default ids,
 *   which this mirrors). It exists ONLY to let already-persisted
 *   messages be matched back to a registry entry after the fact — e.g.
 *   for picking a per-message avatar from message.model. Never use this
 *   to pick what to send in a new chat request; that's still
 *   `resolveChatProviderModelId(key)` server-side.
 */
export type ChatModelOption = {
  key: ChatModelKey;
  label: string;
  shortLabel: string;
  provider: ChatModelProvider;
  providerLabel: string;
  supportsVision: boolean;
  avatarSrc: string;
  providerModelId: string;
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
    avatarSrc: "/model-avatars/claude-sonnet-4-6.png",
    providerModelId: "claude-sonnet-4-6",
  },
  {
    key: "opus",
    label: "Claude Opus 4.6",
    shortLabel: "Claude",
    provider: "anthropic",
    providerLabel: "Anthropic",
    supportsVision: true,
    avatarSrc: "/model-avatars/claude-opus-4-6.png",
    providerModelId: "claude-opus-4-6",
  },
  {
    key: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    shortLabel: "GPT",
    provider: "openai",
    providerLabel: "OpenAI",
    supportsVision: true,
    avatarSrc: "/model-avatars/gpt-5.6-sol.png",
    providerModelId: "gpt-5.6-sol",
  },
  {
    key: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    shortLabel: "Gemini",
    provider: "google",
    providerLabel: "Google",
    supportsVision: true,
    avatarSrc: "/model-avatars/gemini-3.6-flash.png",
    providerModelId: "gemini-3.6-flash",
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

export function getChatModelAvatarSrc(model: ChatModelKey) {
  return getChatModelOption(model).avatarSrc;
}

/**
 * Resolves a per-message avatar from the raw provider model id already
 * persisted on that message (`message.model`, e.g. "gpt-5.6-sol") — NOT
 * from the registry `key` and NOT from whatever the composer's current
 * model selection happens to be. This is what makes each assistant
 * bubble show the model that actually generated it, even after the
 * conversation's active model has since changed.
 *
 * Returns null for a null/unrecognized id (older messages predating
 * model tracking, or any id this registry doesn't know) — callers
 * should fall back to COMI's own avatar in that case, never to a
 * guessed model.
 */
export function getChatModelAvatarSrcForModelId(
  rawModelId: string | null | undefined,
): string | null {
  if (!rawModelId) {
    return null;
  }

  const option = CHAT_MODEL_OPTIONS.find(
    (candidate) => candidate.providerModelId === rawModelId,
  );

  return option?.avatarSrc ?? null;
}
