import { NextResponse } from "next/server";
import { SupabaseConversationRepository } from "@/server/repositories/supabase-conversation-repository";
import { resolveOwnerId } from "@/server/auth/owner-context";
import { deleteConversationImages } from "@/server/attachments/image-storage";
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
    const ownerId = await resolveOwnerId();
    const conversation = await new SupabaseConversationRepository(
      undefined,
      ownerId,
    ).rename(conversationId, title.title);

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
    const ownerId = await resolveOwnerId();
    const deleted = await new SupabaseConversationRepository(
      undefined,
      ownerId,
    ).delete(conversationId);

    if (!deleted) {
      return jsonError("Conversation not found.", 404);
    }

    // Best-effort — the conversation is already gone at this point; see
    // deleteConversationImages' doc comment for why a Storage failure
    // here must not turn this into an error response.
    await deleteConversationImages(ownerId, conversationId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handlePersistenceError(error);
  }
}
