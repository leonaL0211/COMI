import { NextResponse } from "next/server";
import { SupabaseConversationRepository } from "@/server/repositories/supabase-conversation-repository";
import {
  handlePersistenceError,
  jsonError,
  readJsonObject,
  validateOptionalTitle,
} from "@/server/api/persistence-route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conversations = await new SupabaseConversationRepository().list();

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
    const conversation = await new SupabaseConversationRepository().create({
      title: title.title,
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return handlePersistenceError(error);
  }
}
