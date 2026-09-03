import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  getAuthConfig,
  maxAccessCodeLength,
  sessionCookieName,
  sessionMaxAgeSeconds,
} from "@/server/auth/auth-config";
import { createSessionToken } from "@/server/auth/session";
import { isTestParticipantId } from "@/server/auth/participants";
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

  // Whitelist check happens before the access code is even verified, and
  // before any session can be created: an unrecognized testUser must never
  // reach a state where a session (real-account or otherwise) gets issued.
  if (
    typeof body.testUser !== "undefined" &&
    !isTestParticipantId(body.testUser)
  ) {
    return noStoreJson({ error: "invalid_test_participant" }, 400);
  }

  const participant = isTestParticipantId(body.testUser)
    ? body.testUser
    : undefined;

  if (!safeAccessCodeEqual(body.accessCode.trim(), config.accessCode)) {
    return noStoreJson({ error: "Invalid access code." }, 401);
  }

  const token = await createSessionToken({
    secret: config.sessionSecret,
    maxAgeSeconds: sessionMaxAgeSeconds,
    participant,
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
): body is { accessCode: string; testUser?: unknown } {
  if (!body) {
    return false;
  }

  const allowedKeys = new Set(["accessCode", "testUser"]);

  if (!Object.keys(body).every((key) => allowedKeys.has(key))) {
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
