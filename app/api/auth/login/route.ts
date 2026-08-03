import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  getAuthConfig,
  maxAccessCodeLength,
  sessionCookieName,
  sessionMaxAgeSeconds,
} from "@/server/auth/auth-config";
import { createSessionToken } from "@/server/auth/session";
import { readJsonObject } from "@/server/api/persistence-route-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonObject(request);

  if (!isLoginRequest(body)) {
    return noStoreJson({ error: "Invalid login request." }, 400);
  }

  const config = getAuthConfig();

  if (config.status !== "enabled") {
    return noStoreJson({ error: "Private access is not configured." }, 503);
  }

  if (!safeAccessCodeEqual(body.accessCode.trim(), config.accessCode)) {
    return noStoreJson({ error: "Invalid access code." }, 401);
  }

  const token = await createSessionToken({
    secret: config.sessionSecret,
    maxAgeSeconds: sessionMaxAgeSeconds,
  });
  const response = noStoreJson({ authenticated: true }, 200);

  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });

  return response;
}

function isLoginRequest(
  body: Record<string, unknown> | null,
): body is { accessCode: string } {
  if (!body || Object.keys(body).length !== 1) {
    return false;
  }

  return (
    typeof body.accessCode === "string" &&
    body.accessCode.trim().length > 0 &&
    body.accessCode.length <= maxAccessCodeLength
  );
}

function safeAccessCodeEqual(candidate: string, expected: string) {
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  return timingSafeEqual(candidateHash, expectedHash);
}

function noStoreJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
