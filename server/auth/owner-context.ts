import { cookies } from "next/headers";
import { getAuthConfig, sessionCookieName } from "./auth-config";
import { verifySessionPayload } from "./session";
import {
  getTestParticipantOwnerId,
  isTestParticipantId,
  type TestParticipantId,
} from "./participants";
import { getSupabaseServerConfig } from "@/server/supabase/config";

/**
 * Explicit, request-scoped participant resolution for the n=4 test.
 *
 * This is the single place that reads the session cookie to find out
 * whether the current request belongs to a whitelisted test participant.
 * Both resolveOwnerId() and isCurrentSessionTestParticipant() are thin,
 * explicit wrappers around this — call one of them once per request and
 * pass the result down; nothing else reads cookies/session state
 * implicitly.
 *
 * Because the login route (app/api/auth/login/route.ts) now rejects any
 * non-whitelisted `testUser` outright (400, no session issued), a valid
 * session's `participant` field — if present at all — is already
 * guaranteed whitelisted. The whitelist re-check here is defense in
 * depth only (e.g. against an older token format), never the primary
 * gate.
 */
async function getCurrentParticipant(): Promise<TestParticipantId | null> {
  const authConfig = getAuthConfig();

  if (authConfig.status !== "enabled") {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const payload = await verifySessionPayload(token, authConfig.sessionSecret).catch(
    () => null,
  );

  if (!payload?.participant || !isTestParticipantId(payload.participant)) {
    return null;
  }

  return payload.participant;
}

/**
 * Resolves which owner_id the current request should use.
 *   - No session / invalid / expired / auth disabled -> real BERRY_OWNER_ID.
 *   - Valid session, no participant tag (normal login) -> real BERRY_OWNER_ID.
 *   - Valid session, whitelisted participant (P01-P04) -> that
 *     participant's dedicated test owner_id.
 */
export async function resolveOwnerId(): Promise<string> {
  const participant = await getCurrentParticipant();

  if (!participant) {
    return getSupabaseServerConfig().ownerId;
  }

  return getTestParticipantOwnerId(participant);
}

/**
 * True only for a valid session carrying a whitelisted P01-P04 tag.
 * Used to gate the backup/export/import feature (UI and API) away from
 * test participants, who must never reach the real-account backup path.
 */
export async function isCurrentSessionTestParticipant(): Promise<boolean> {
  return (await getCurrentParticipant()) !== null;
}
