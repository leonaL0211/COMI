export type ChatModelKey = "sonnet" | "opus";

export type ChatModelOption = {
  key: ChatModelKey;
  label: string;
};

export const DEFAULT_CHAT_MODEL: ChatModelKey = "sonnet";

export const CHAT_MODEL_OPTIONS: readonly ChatModelOption[] = [
  {
    key: "sonnet",
    label: "Sonnet 4.6",
  },
  {
    key: "opus",
    label: "Opus 4.6",
  },
];

export function isChatModelKey(value: unknown): value is ChatModelKey {
  return value === "sonnet" || value === "opus";
}

export function getChatModelLabel(model: ChatModelKey) {
  return (
    CHAT_MODEL_OPTIONS.find((option) => option.key === model)?.label ??
    CHAT_MODEL_OPTIONS[0].label
  );
}
