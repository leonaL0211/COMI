import { NextResponse } from "next/server";
import { RepositoryError } from "@/server/repositories/repository-error";
import { SupabaseConfigError, isValidUuid } from "@/server/supabase/config";

const maxTitleLength = 160;

export type TitleValidationResult =
  | {
      ok: true;
      title: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function handlePersistenceError(error: unknown) {
  if (error instanceof RepositoryError) {
    return jsonError(error.message, error.status);
  }

  if (error instanceof SupabaseConfigError) {
    return jsonError(error.message, 500);
  }

  return jsonError("Persistence request failed.", 500);
}

export function validateUuid(value: string) {
  return isValidUuid(value) ? null : jsonError("Invalid conversation id.", 400);
}

export async function readJsonObject(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    return body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function validateRequiredTitle(value: unknown): TitleValidationResult {
  if (typeof value !== "string") {
    return { ok: false, response: jsonError("title must be a string.", 400) };
  }

  return validateTitle(value);
}

export function validateOptionalTitle(value: unknown): TitleValidationResult {
  if (typeof value === "undefined") {
    return { ok: true, title: "新对话" };
  }

  if (typeof value !== "string") {
    return { ok: false, response: jsonError("title must be a string.", 400) };
  }

  return validateTitle(value);
}

function validateTitle(value: string): TitleValidationResult {
  const title = value.trim();

  if (!title) {
    return { ok: false, response: jsonError("title cannot be empty.", 400) };
  }

  if (title.length > maxTitleLength) {
    return {
      ok: false,
      response: jsonError(`title cannot exceed ${maxTitleLength} characters.`, 400),
    };
  }

  return { ok: true, title };
}
