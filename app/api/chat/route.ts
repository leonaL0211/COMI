import { NextResponse } from "next/server";
import {
  PersistentChatService,
  PersistentChatServiceError,
} from "@/server/chat/persistent-chat-service";
import { resolveOwnerId } from "@/server/auth/owner-context";
import { isAllowedImageMimeType } from "@/server/attachments/image-processing";
import { attachImageDisplayUrl } from "@/server/attachments/image-message-view";
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
// Roughly maxUploadBytes (15MB) as base64 text length (~4/3 expansion),
// with headroom. server/attachments/image-processing.ts re-validates the
// decoded byte length; this is just a cheap early reject.
const maxImageBase64Length = 21 * 1024 * 1024;

type ValidationResult =
  | {
      ok: true;
      conversationId: string;
      content: string;
      model: ChatModelKey;
      clientMessageId: string | null;
      image: { mimeType: string; data: string } | null;
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
    const ownerId = await resolveOwnerId();
    const result = await new PersistentChatService(ownerId).sendMessage({
      conversationId: validation.conversationId,
      content: validation.content,
      model: validation.model,
      clientMessageId: validation.clientMessageId,
      image: validation.image ?? undefined,
    });

    const [userMessage, assistantMessage] = await Promise.all([
      attachImageDisplayUrl(result.userMessage, ownerId),
      attachImageDisplayUrl(result.assistantMessage, ownerId),
    ]);

    return NextResponse.json({
      ...result,
      userMessage,
      assistantMessage,
    });
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

  if (content.length > maxContentLength) {
    return {
      ok: false,
      response: jsonError(
        `content cannot exceed ${maxContentLength} characters.`,
        400,
      ),
    };
  }

  const imageValidation = validateImageField(body.image);

  if (!imageValidation.ok) {
    return imageValidation;
  }

  if (!content && !imageValidation.image) {
    return { ok: false, response: jsonError("content cannot be empty.", 400) };
  }

  const model = body.model ?? DEFAULT_CHAT_MODEL;

  if (!isChatModelKey(model)) {
    return {
      ok: false,
      response: jsonError("model must be sonnet or opus.", 400),
    };
  }

  const clientMessageId = body.clientMessageId;

  if (
    typeof clientMessageId !== "undefined" &&
    clientMessageId !== null &&
    (typeof clientMessageId !== "string" ||
      clientMessageId.trim().length === 0 ||
      clientMessageId.length > 120)
  ) {
    return {
      ok: false,
      response: jsonError(
        "clientMessageId must be a non-empty string up to 120 characters.",
        400,
      ),
    };
  }

  return {
    ok: true,
    conversationId,
    content,
    model,
    clientMessageId:
      typeof clientMessageId === "string" ? clientMessageId.trim() : null,
    image: imageValidation.image,
  };
}

function validateImageField(
  value: unknown,
):
  | { ok: true; image: { mimeType: string; data: string } | null }
  | { ok: false; response: NextResponse } {
  if (typeof value === "undefined" || value === null) {
    return { ok: true, image: null };
  }

  if (typeof value !== "object") {
    return { ok: false, response: jsonError("image must be an object.", 400) };
  }

  const record = value as Record<string, unknown>;
  const mimeType = record.mimeType;
  const data = record.data;

  if (!isAllowedImageMimeType(mimeType)) {
    return {
      ok: false,
      response: jsonError(
        "image.mimeType must be image/jpeg, image/png, or image/webp.",
        400,
      ),
    };
  }

  if (typeof data !== "string" || data.length === 0) {
    return {
      ok: false,
      response: jsonError("image.data must be a non-empty base64 string.", 400),
    };
  }

  if (data.length > maxImageBase64Length) {
    return {
      ok: false,
      response: jsonError("Image is too large.", 400),
    };
  }

  return { ok: true, image: { mimeType, data } };
}
