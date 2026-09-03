import { getImageStorageKeyFromContent } from "@/shared/attachments/image-catalog";
import { resolveImageDisplayUrl } from "./image-storage";
import type { PersistedMessage } from "@/server/repositories/message-repository";

export type PersistedMessageWithImage = PersistedMessage & {
  imageUrl: string | null;
};

/**
 * Attaches a fresh, short-lived signed display URL to a message if its
 * content references an image — never persisted, regenerated on every
 * read. See resolveImageDisplayUrl for the ownerId isolation check.
 */
export async function attachImageDisplayUrl(
  message: PersistedMessage,
  ownerId: string,
): Promise<PersistedMessageWithImage> {
  const storageKey = getImageStorageKeyFromContent(message.content);

  if (!storageKey) {
    return { ...message, imageUrl: null };
  }

  const imageUrl = await resolveImageDisplayUrl(storageKey, ownerId);

  return { ...message, imageUrl };
}

export async function attachImageDisplayUrls(
  messages: PersistedMessage[],
  ownerId: string,
): Promise<PersistedMessageWithImage[]> {
  return Promise.all(
    messages.map((message) => attachImageDisplayUrl(message, ownerId)),
  );
}
