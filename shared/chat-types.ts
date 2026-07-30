export type ChatRole = "system" | "user" | "assistant";

export type ChatStopReason = "end_turn" | "max_tokens" | "unknown";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type ChatCompletionResult = {
  text: string;
  model?: string | null;
  stopReason: ChatStopReason;
  usage?: ChatUsage;
};
