import { NextResponse } from "next/server";
import { jsonError, readJsonObject } from "@/server/api/persistence-route-utils";
import { validateMemoryCreateRequest } from "@/server/memory/memory-api-validation";
import { RepositoryError } from "@/server/repositories/repository-error";
import { SupabaseMemoryRepository } from "@/server/repositories/supabase-memory-repository";
import { SupabaseConfigError } from "@/server/supabase/config";
import { resolveOwnerId } from "@/server/auth/owner-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ownerId = await resolveOwnerId();
    const memories = await new SupabaseMemoryRepository(undefined, ownerId).list();

    return NextResponse.json({ memories });
  } catch {
    return jsonError("Unable to complete memory request.", 500);
  }
}

export async function POST(request: Request) {
  const body = await readJsonObject(request);

  if (!body) {
    return jsonError("Invalid memory request.", 400);
  }

  const validation = validateMemoryCreateRequest(body);

  if (!validation.ok) {
    return jsonError("Invalid memory request.", 400);
  }

  try {
    const ownerId = await resolveOwnerId();
    const memory = await new SupabaseMemoryRepository(undefined, ownerId).create({
      ...validation.input,
      source: "manual",
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return handleMemoryError(error);
  }
}

function handleMemoryError(error: unknown) {
  if (error instanceof RepositoryError && error.status === 400) {
    return jsonError("Invalid memory request.", 400);
  }

  if (error instanceof SupabaseConfigError) {
    return jsonError("Unable to complete memory request.", 500);
  }

  return jsonError("Unable to complete memory request.", 500);
}

