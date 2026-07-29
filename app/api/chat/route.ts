import { NextResponse } from "next/server";
import { ChatService } from "@/server/chat/chat-service";
import { ChatProviderError } from "@/server/providers/chat-provider";
import type { ChatMessage } from "@/shared/chat-types";

export const dynamic = "force-dynamic";

const maxMessages = 40;
const maxMessageLength = 8000;

type ValidationResult =
  | {
      ok: true;
      messages: ChatMessage[];
    }
  | {
      ok: false;
      error: string;
    };

type MessageValidationResult =
  | {
      ok: true;
      message: ChatMessage;
    }
  | {
      ok: false;
      error: string;
    };

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const validation = validateChatRequest(body);

  if (!validation.ok) {
    return jsonError(validation.error, 400);
  }

  try {
    const result = await new ChatService().sendMessage(validation.messages);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ChatProviderError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("Chat request failed.", 500);
  }
}

function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be an object." };
  }

  const messages = (body as { messages?: unknown }).messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages must be a non-empty array." };
  }

  if (messages.length > maxMessages) {
    return { ok: false, error: `messages cannot exceed ${maxMessages} items.` };
  }

  const parsed: ChatMessage[] = [];

  for (const [index, message] of messages.entries()) {
    const parsedMessage = parseMessage(message, index);

    if (!parsedMessage.ok) {
      return parsedMessage;
    }

    parsed.push(parsedMessage.message);
  }

  if (!parsed.some((message) => message.role === "user")) {
    return { ok: false, error: "messages must include at least one user message." };
  }

  return { ok: true, messages: parsed };
}

function parseMessage(
  message: unknown,
  index: number,
): MessageValidationResult {
  if (!message || typeof message !== "object") {
    return { ok: false, error: `messages[${index}] must be an object.` };
  }

  const record = message as Record<string, unknown>;

  if (record.role !== "user" && record.role !== "assistant") {
    return {
      ok: false,
      error: `messages[${index}].role must be "user" or "assistant".`,
    };
  }

  if (typeof record.content !== "string" || !record.content.trim()) {
    return {
      ok: false,
      error: `messages[${index}].content must be a non-empty string.`,
    };
  }

  if (record.content.length > maxMessageLength) {
    return {
      ok: false,
      error: `messages[${index}].content cannot exceed ${maxMessageLength} characters.`,
    };
  }

  return {
    ok: true,
    message: {
      role: record.role,
      content: record.content,
    },
  };
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
