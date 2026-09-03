import { NextResponse } from "next/server";
import { SupabaseConversationRepository } from "@/server/repositories/supabase-conversation-repository";
import { resolveOwnerId } from "@/server/auth/owner-context";
import {
  handlePersistenceError,
  jsonError,
  readJsonObject,
  validateOptionalTitle,
} from "@/server/api/persistence-route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ownerId = await resolveOwnerId();
    const conversations = await new SupabaseConversationRepository(
      undefined,
      ownerId,
    ).list();

    return NextResponse.json({ conversations });
  } catch (error) {
    return handlePersistenceError(error);
  }
}

export async function POST(request: Request) {
  const body = await readJsonObject(request);

  if (!body) {
    return jsonError("Request body must be a JSON object.", 400);
  }

  const title = validateOptionalTitle(body.title);

  if (!title.ok) {
    return title.response;
  }

  try {
    const ownerId = await resolveOwnerId();
    const conversation = await new SupabaseConversationRepository(
      undefined,
      ownerId,
    ).create({
      title: title.title,
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return handlePersistenceError(error);
  }
}
