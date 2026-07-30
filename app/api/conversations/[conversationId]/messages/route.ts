import { NextResponse } from "next/server";
import { SupabaseConversationRepository } from "@/server/repositories/supabase-conversation-repository";
import { SupabaseMessageRepository } from "@/server/repositories/supabase-message-repository";
import {
  handlePersistenceError,
  jsonError,
  validateUuid,
} from "@/server/api/persistence-route-utils";

export const dynamic = "force-dynamic";

type MessagesRouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(_request: Request, { params }: MessagesRouteContext) {
  const { conversationId } = await params;
  const uuidError = validateUuid(conversationId);

  if (uuidError) {
    return uuidError;
  }

  try {
    const conversation = await new SupabaseConversationRepository().findById(
      conversationId,
    );

    if (!conversation) {
      return jsonError("Conversation not found.", 404);
    }

    const messages = await new SupabaseMessageRepository().listByConversation(
      conversationId,
    );

    return NextResponse.json({ messages });
  } catch (error) {
    return handlePersistenceError(error);
  }
}
