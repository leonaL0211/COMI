import { NextResponse } from "next/server";
import {
  PersistentChatService,
  PersistentChatServiceError,
} from "@/server/chat/persistent-chat-service";
import {
  handlePersistenceError,
  jsonError,
  readJsonObject,
  validateUuid,
} from "@/server/api/persistence-route-utils";
import {
  DEFAULT_CHAT_MODEL,
  isChatModelKey,
  type ChatModelKey,
} from "@/shared/chat-models";

export const dynamic = "force-dynamic";

const maxContentLength = 8000;

type ValidationResult =
  | {
      ok: true;
      conversationId: string;
      content: string;
      model: ChatModelKey;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function POST(request: Request) {
  const body = await readJsonObject(request);

  if (!body) {
    return jsonError("Request body must be a JSON object.", 400);
  }

  const validation = validateChatRequest(body);

  if (!validation.ok) {
    return validation.response;
  }

  try {
    const result = await new PersistentChatService().sendMessage({
      conversationId: validation.conversationId,
      content: validation.content,
      model: validation.model,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PersistentChatServiceError) {
      return jsonError(error.message, error.status);
    }

    return handlePersistenceError(error);
  }
}

function validateChatRequest(body: Record<string, unknown>): ValidationResult {
  const conversationId = body.conversationId;

  if (typeof conversationId !== "string") {
    return {
      ok: false,
      response: jsonError("conversationId must be a string.", 400),
    };
  }

  const uuidError = validateUuid(conversationId);

  if (uuidError) {
    return { ok: false, response: uuidError };
  }

  if (typeof body.content !== "string") {
    return {
      ok: false,
      response: jsonError("content must be a string.", 400),
    };
  }

  const content = body.content.trim();

  if (!content) {
    return { ok: false, response: jsonError("content cannot be empty.", 400) };
  }

  if (content.length > maxContentLength) {
    return {
      ok: false,
      response: jsonError(
        `content cannot exceed ${maxContentLength} characters.`,
        400,
      ),
    };
  }

  const model = body.model ?? DEFAULT_CHAT_MODEL;

  if (!isChatModelKey(model)) {
    return {
      ok: false,
      response: jsonError("model must be sonnet or opus.", 400),
    };
  }

  return {
    ok: true,
    conversationId,
    content,
    model,
  };
}
