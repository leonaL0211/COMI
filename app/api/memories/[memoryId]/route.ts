import { NextResponse } from "next/server";
import { jsonError, readJsonObject } from "@/server/api/persistence-route-utils";
import { validateMemoryUpdateRequest } from "@/server/memory/memory-api-validation";
import { RepositoryError } from "@/server/repositories/repository-error";
import { SupabaseMemoryRepository } from "@/server/repositories/supabase-memory-repository";
import { isValidUuid, SupabaseConfigError } from "@/server/supabase/config";
import { resolveOwnerId } from "@/server/auth/owner-context";

export const dynamic = "force-dynamic";

type MemoryRouteContext = {
  params: Promise<{
    memoryId: string;
  }>;
};

export async function PATCH(request: Request, { params }: MemoryRouteContext) {
  const { memoryId } = await params;

  if (!isValidUuid(memoryId)) {
    return jsonError("Invalid memory request.", 400);
  }

  const body = await readJsonObject(request);

  if (!body) {
    return jsonError("Invalid memory request.", 400);
  }

  const validation = validateMemoryUpdateRequest(body);

  if (!validation.ok) {
    return jsonError("Invalid memory request.", 400);
  }

  try {
    const ownerId = await resolveOwnerId();
    const memory = await new SupabaseMemoryRepository(undefined, ownerId).update(
      memoryId,
      validation.input,
    );

    return NextResponse.json({ memory });
  } catch (error) {
    return handleMemoryError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: MemoryRouteContext,
) {
  const { memoryId } = await params;

  if (!isValidUuid(memoryId)) {
    return jsonError("Invalid memory request.", 400);
  }

  try {
    const ownerId = await resolveOwnerId();
    await new SupabaseMemoryRepository(undefined, ownerId).delete(memoryId);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleMemoryError(error);
  }
}

function handleMemoryError(error: unknown) {
  if (error instanceof RepositoryError) {
    if (error.status === 404) {
      return jsonError("Memory not found.", 404);
    }

    if (error.status === 400) {
      return jsonError("Invalid memory request.", 400);
    }
  }

  if (error instanceof SupabaseConfigError) {
    return jsonError("Unable to complete memory request.", 500);
  }

  return jsonError("Unable to complete memory request.", 500);
}

