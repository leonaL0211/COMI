import type { ConversationSummary } from "@/server/repositories/summary-repository";
import type { PersistedMessage } from "@/server/repositories/message-repository";
import type { SummaryPolicyDecision, SummaryPolicyInput } from "./types";

export const RECENT_MESSAGES_TO_KEEP = 8;
export const MIN_COMPRESSIBLE_MESSAGES = 16;
export const MIN_COMPRESSIBLE_CHARACTERS = 12000;

export function decideSummaryPolicy({
  currentUserMessageId,
  existingSummary,
  messages,
}: SummaryPolicyInput): SummaryPolicyDecision {
  const currentUserIndex = messages.findIndex(
    (message) => message.id === currentUserMessageId,
  );

  if (currentUserIndex < 0 || messages[currentUserIndex]?.role !== "user") {
    return { status: "invalid_checkpoint", reason: "current_user_not_found" };
  }

  const validation = validateExistingSummary(
    existingSummary,
    messages,
    currentUserIndex,
  );

  if (validation.status === "invalid_checkpoint") {
    return validation;
  }

  const startIndex = findNextUserMessageIndex(
    messages,
    validation.checkpointIndex + 1,
    currentUserIndex,
  );

  if (startIndex < 0) {
    return {
      status: "not_needed",
      summary: validation.summary,
    };
  }

  const keepWindowStart = Math.max(0, currentUserIndex - RECENT_MESSAGES_TO_KEEP);
  const candidateEndExclusive = Math.max(startIndex, keepWindowStart);
  const checkpointIndex = findLastAssistantIndexBefore(
    messages,
    startIndex,
    candidateEndExclusive,
  );

  if (checkpointIndex < startIndex) {
    return {
      status: "not_needed",
      summary: validation.summary,
    };
  }

  const messagesToSummarize = messages.slice(startIndex, checkpointIndex + 1);
  const characterCount = countMessageCharacters(messagesToSummarize);

  if (
    messagesToSummarize.length < MIN_COMPRESSIBLE_MESSAGES &&
    characterCount < MIN_COMPRESSIBLE_CHARACTERS
  ) {
    return {
      status: "not_needed",
      summary: validation.summary,
    };
  }

  return {
    status: "should_summarize",
    previousSummary: validation.summary,
    messagesToSummarize,
    checkpointMessage: messages[checkpointIndex],
    coveredMessageCount:
      (validation.summary?.coveredMessageCount ?? 0) +
      messagesToSummarize.length,
  };
}

type SummaryValidation =
  | {
      status: "valid";
      summary: ConversationSummary | null;
      checkpointIndex: number;
    }
  | {
      status: "invalid_checkpoint";
      reason: string;
    };

function validateExistingSummary(
  summary: ConversationSummary | null,
  messages: PersistedMessage[],
  currentUserIndex: number,
): SummaryValidation {
  if (!summary) {
    return {
      status: "valid",
      summary: null,
      checkpointIndex: -1,
    };
  }

  const checkpointIndex = messages.findIndex(
    (message) => message.id === summary.coveredThroughMessageId,
  );

  if (checkpointIndex < 0) {
    return { status: "invalid_checkpoint", reason: "checkpoint_not_found" };
  }

  if (messages[checkpointIndex]?.role !== "assistant") {
    return { status: "invalid_checkpoint", reason: "checkpoint_not_assistant" };
  }

  if (
    !Number.isInteger(summary.coveredMessageCount) ||
    summary.coveredMessageCount <= 0
  ) {
    return { status: "invalid_checkpoint", reason: "invalid_covered_count" };
  }

  if (checkpointIndex >= currentUserIndex) {
    return {
      status: "invalid_checkpoint",
      reason: "checkpoint_reaches_current_user",
    };
  }

  if (summary.coveredMessageCount > checkpointIndex + 1) {
    return {
      status: "invalid_checkpoint",
      reason: "covered_count_exceeds_checkpoint",
    };
  }

  return {
    status: "valid",
    summary,
    checkpointIndex,
  };
}

function findNextUserMessageIndex(
  messages: PersistedMessage[],
  startIndex: number,
  endExclusive: number,
) {
  for (let index = startIndex; index < endExclusive; index += 1) {
    if (messages[index]?.role === "user") {
      return index;
    }
  }

  return -1;
}

function findLastAssistantIndexBefore(
  messages: PersistedMessage[],
  startIndex: number,
  endExclusive: number,
) {
  for (let index = endExclusive - 1; index >= startIndex; index -= 1) {
    if (messages[index]?.role === "assistant") {
      return index;
    }
  }

  return -1;
}

function countMessageCharacters(messages: PersistedMessage[]) {
  return messages.reduce((total, message) => total + message.content.length, 0);
}
