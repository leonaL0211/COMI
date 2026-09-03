import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/server/supabase/admin-client";
import { getImageStorageKeyOwnerId, isImageStorageKey } from "@/shared/attachments/image-catalog";
import { isValidUuid } from "@/server/supabase/config";

/**
 * Private Supabase Storage bucket for chat image messages. Created once as
 * infrastructure provisioning (public: false, no anon/authenticated
 * policies — see the DELIVERY report for the exact command run). Every
 * access in this app goes through the service-role admin client, the same
 * "server-only" model already used for the messages/conversations tables;
 * there is nothing here for RLS to gate.
 */
const imageBucket = "comi-chat-images";

/** Signed URLs are regenerated on every message read, never persisted. */
const signedUrlTtlSeconds = 600;

export class ImageStorageError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "ImageStorageError";
  }
}

function buildStorageKey(ownerId: string, conversationId: string) {
  return `${ownerId}/${conversationId}/${randomUUID()}.jpg`;
}

export async function uploadImage(input: {
  ownerId: string;
  conversationId: string;
  buffer: Buffer;
}): Promise<string> {
  const storageKey = buildStorageKey(input.ownerId, input.conversationId);
  const client = getSupabaseAdminClient();

  const { error } = await client.storage
    .from(imageBucket)
    .upload(storageKey, input.buffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new ImageStorageError(`Image upload failed: ${error.message}`);
  }

  return storageKey;
}

export async function deleteImage(storageKey: string): Promise<void> {
  try {
    await getSupabaseAdminClient().storage.from(imageBucket).remove([storageKey]);
  } catch {
    // Best-effort cleanup only — never let a cleanup failure mask the
    // original error that triggered it.
  }
}

/**
 * Removes every image object under one conversation's storage prefix.
 * Called only from the conversation DELETE route, and only AFTER the
 * conversation row itself was actually deleted — `ownerId` there comes
 * from resolveOwnerId() (never the client) and the DB delete is already
 * scoped `.eq("owner_id", ownerId)`, so by the time this runs we already
 * know the caller owned this conversation. The prefix is built here from
 * those two trusted values only; nothing accepts a client-supplied path.
 *
 * Best-effort, matching deleteImage above: the conversation is already
 * gone from the database at this point, which is the operation the
 * caller actually asked for and already got confirmed. A Storage failure
 * here (network blip, object already gone, etc.) must not turn that
 * already-succeeded delete into an error response — it would be
 * misleading (the conversation *is* deleted) and there's nothing left to
 * roll back to. Worst case on failure is a harmless orphaned image
 * object with no database row pointing at it — no broken reference, no
 * cross-account exposure, just reclaimable storage space.
 */
export async function deleteConversationImages(
  ownerId: string,
  conversationId: string,
): Promise<void> {
  if (!isValidUuid(ownerId) || !isValidUuid(conversationId)) {
    return;
  }

  const prefix = `${ownerId}/${conversationId}`;

  try {
    const client = getSupabaseAdminClient();
    const { data: files, error: listError } = await client.storage
      .from(imageBucket)
      .list(prefix, { limit: 1000 });

    if (listError || !files || files.length === 0) {
      return;
    }

    const paths = files.map((file) => `${prefix}/${file.name}`);

    await client.storage.from(imageBucket).remove(paths);
  } catch {
    // Best-effort — see doc comment above.
  }
}

/**
 * Resolves a `[[image:<storageKey>]]` token's storage key into a signed,
 * short-lived display URL — but ONLY if the key's embedded ownerId
 * matches the caller's own resolved ownerId. A message's `content` is
 * free-form user-typed text; nothing stops a user from typing a
 * well-formed-looking `[[image:<someone-else's-uuid>/...]]` string
 * themselves. This check is what stops that from turning into a
 * cross-account image read — never generate a signed URL for a storage
 * key whose owner segment doesn't match the current session.
 */
export async function resolveImageDisplayUrl(
  storageKey: string,
  callerOwnerId: string,
): Promise<string | null> {
  if (!isImageStorageKey(storageKey)) {
    return null;
  }

  if (getImageStorageKeyOwnerId(storageKey) !== callerOwnerId) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(imageBucket)
      .createSignedUrl(storageKey, signedUrlTtlSeconds);

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch {
    return null;
  }
}
