/**
 * Image message token — mirrors shared/stickers/sticker-catalog.ts's
 * `[[sticker:ID]]` convention so image messages can reuse the same
 * `messages.content` text column with no schema change.
 *
 * A token looks like `[[image:<ownerId>/<conversationId>/<fileId>.jpg]]`.
 * The storage key format is intentionally rigid (three UUID segments plus
 * a fixed `.jpg` extension — every upload is normalized to JPEG server-side,
 * see server/attachments/image-processing.ts) so this regex can't be used
 * as an open path-injection surface: anything that doesn't match this exact
 * shape is treated as plain text, never as an image reference.
 */

const uuidSegment = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const storageKeyPattern = new RegExp(
  `^${uuidSegment}/${uuidSegment}/${uuidSegment}\\.jpg$`,
  "i",
);

const imageTokenPattern = new RegExp(
  `\\[\\[image:(${uuidSegment}/${uuidSegment}/${uuidSegment}\\.jpg)\\]\\]`,
  "gi",
);
const exactImageTokenPattern = new RegExp(
  `^\\[\\[image:(${uuidSegment}/${uuidSegment}/${uuidSegment}\\.jpg)\\]\\]$`,
  "i",
);

export type ImageContentPart =
  | { type: "text"; content: string }
  | { type: "image"; storageKey: string; token: string };

export function isImageStorageKey(value: unknown): value is string {
  return typeof value === "string" && storageKeyPattern.test(value);
}

/** The ownerId is the first path segment of the storage key. */
export function getImageStorageKeyOwnerId(storageKey: string): string | null {
  if (!isImageStorageKey(storageKey)) {
    return null;
  }

  return storageKey.split("/")[0] ?? null;
}

export function createImageToken(storageKey: string) {
  return `[[image:${storageKey}]]`;
}

export function parseImageContent(content: string): ImageContentPart[] {
  const parts: ImageContentPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(imageTokenPattern)) {
    const token = match[0];
    const storageKey = match[1];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, index) });
    }

    parts.push({ type: "image", storageKey, token });
    lastIndex = index + token.length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content }];
}

/** First (and, in this MVP, only) image storage key referenced by a message. */
export function getImageStorageKeyFromContent(content: string): string | null {
  const part = parseImageContent(content).find((p) => p.type === "image");

  return part?.type === "image" ? part.storageKey : null;
}

/** True only when the message is the image token and nothing else (no caption). */
export function isImageOnlyContent(content: string): boolean {
  return exactImageTokenPattern.test(content.trim());
}

/**
 * Text-only caption that goes with an image message, i.e. the content with
 * the image token removed. Used for the live vision request's text part
 * (the image itself is attached separately as a real content part — no
 * need to also tell the model "an image was attached" there) and for
 * rendering the composer preview's caption.
 */
export function stripImageToken(content: string): string {
  return parseImageContent(content)
    .filter((part) => part.type === "text")
    .map((part) => part.content)
    .join("")
    .trim();
}

/**
 * Neutral, non-visual description used everywhere EXCEPT the current
 * turn's live vision request: older turns re-sent as context, summary
 * input, and memory extraction input. Mirrors
 * describeStickerContentForModel — never describes what is actually in
 * the picture (that would let vision-inferred "facts" leak into
 * summary/memory), only that an image was sent.
 */
export function describeImageContentForModel(
  content: string,
  role: "user" | "assistant",
) {
  return parseImageContent(content)
    .map((part) => {
      if (part.type === "text") {
        return part.content;
      }

      const actor = role === "user" ? "用户" : "助手";
      return `[${actor}发送了一张图片]`;
    })
    .join("")
    .trim();
}
