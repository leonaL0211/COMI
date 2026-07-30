import { NextResponse } from "next/server";
import { SupabaseConversationRepository } from "@/server/repositories/supabase-conversation-repository";
import {
  handlePersistenceError,
  jsonError,
  readJsonObject,
  validateRequiredTitle,
  validateUuid,
} from "@/server/api/persistence-route-utils";

export const dynamic = "force-dynamic";

type ConversationRouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: ConversationRouteContext,
) {
  const { conversationId } = await params;
  const uuidError = validateUuid(conversationId);

  if (uuidError) {
    return uuidError;
  }

  const body = await readJsonObject(request);

  if (!body) {
    return jsonError("Request body must be a JSON object.", 400);
  }

  const title = validateRequiredTitle(body.title);

  if (!title.ok) {
    return title.response;
  }

  try {
    const conversation = await new SupabaseConversationRepository().rename(
      conversationId,
      title.title,
    );

    if (!conversation) {
      return jsonError("Conversation not found.", 404);
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    return handlePersistenceError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: ConversationRouteContext,
) {
  const { conversationId } = await params;
  const uuidError = validateUuid(conversationId);

  if (uuidError) {
    return uuidError;
  }

  try {
    const deleted = await new SupabaseConversationRepository().delete(
      conversationId,
    );

    if (!deleted) {
      return jsonError("Conversation not found.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handlePersistenceError(error);
  }
}
