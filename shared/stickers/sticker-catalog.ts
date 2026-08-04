export const stickerCatalog = [
  {
    id: "please",
    src: "/stickers/please.png",
    label: "拜托啊",
    alt: "拜托啊表情包",
    width: 1206,
    height: 1206,
  },
  {
    id: "pat-on-head",
    src: "/stickers/pat-on-head.png",
    label: "摸摸头",
    alt: "摸摸头表情包",
    width: 1128,
    height: 1128,
  },
  {
    id: "kisskiss",
    src: "/stickers/kisskiss.png",
    label: "亲亲",
    alt: "亲亲表情包",
    width: 1160,
    height: 1160,
  },
  {
    id: "like-you",
    src: "/stickers/like-you.png",
    label: "喜欢你",
    alt: "喜欢你表情包",
    width: 1133,
    height: 1133,
  },
  {
    id: "comfy",
    src: "/stickers/comfy.png",
    label: "好舒服",
    alt: "好舒服表情包",
    width: 1206,
    height: 1206,
  },
  {
    id: "looking-forward",
    src: "/stickers/looking-forward.png",
    label: "期待",
    alt: "期待表情包",
    width: 1129,
    height: 1129,
  },
  {
    id: "thinking",
    src: "/stickers/new-pack/thinking.png",
    label: "思考",
    alt: "思考表情包",
    width: 1206,
    height: 1206,
  },
  {
    id: "yeah",
    src: "/stickers/new-pack/yeah.png",
    label: "好耶",
    alt: "好耶表情包",
    width: 1206,
    height: 1206,
  },
  {
    id: "looking-at-you",
    src: "/stickers/new-pack/looking-at-you.png",
    label: "看着你",
    alt: "看着你表情包",
    width: 1123,
    height: 1123,
  },
  {
    id: "being-proud",
    src: "/stickers/new-pack/being-proud.png",
    label: "骄傲",
    alt: "骄傲表情包",
    width: 1206,
    height: 1206,
  },
  {
    id: "want-hug",
    src: "/stickers/new-pack/want-hug.png",
    label: "想抱抱",
    alt: "想抱抱表情包",
    width: 1206,
    height: 1206,
  },
  {
    id: "love-you",
    src: "/stickers/new-pack/love-you.png",
    label: "爱你",
    alt: "爱你表情包",
    width: 1161,
    height: 1161,
  },
  {
    id: "staring",
    src: "/stickers/new-pack/staring.png",
    label: "盯着看",
    alt: "盯着看表情包",
    width: 1118,
    height: 1118,
  },
  {
    id: "sniffing",
    src: "/stickers/new-pack/sniffing.png",
    label: "闻闻",
    alt: "闻闻表情包",
    width: 1206,
    height: 1206,
  },
  {
    id: "got-it",
    src: "/stickers/new-pack/got-it.png",
    label: "收到",
    alt: "收到表情包",
    width: 1206,
    height: 1206,
  },
] as const;

export type Sticker = (typeof stickerCatalog)[number];
export type StickerId = Sticker["id"];

export type StickerContentPart =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "sticker";
      sticker: Sticker;
      token: string;
    };

const stickerTokenPattern = /\[\[sticker:([a-z0-9-]+)\]\]/g;
const exactStickerTokenPattern = /^\[\[sticker:([a-z0-9-]+)\]\]$/;

export function isStickerId(value: unknown): value is StickerId {
  return (
    typeof value === "string" &&
    stickerCatalog.some((sticker) => sticker.id === value)
  );
}

export function getStickerById(id: string): Sticker | null {
  return stickerCatalog.find((sticker) => sticker.id === id) ?? null;
}

export function createStickerToken(id: StickerId) {
  return `[[sticker:${id}]]`;
}

export function parseStickerContent(content: string): StickerContentPart[] {
  const parts: StickerContentPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(stickerTokenPattern)) {
    const token = match[0];
    const rawId = match[1];
    const index = match.index ?? 0;
    const sticker = getStickerById(rawId);

    if (!sticker) {
      continue;
    }

    if (index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, index) });
    }

    parts.push({ type: "sticker", sticker, token });
    lastIndex = index + token.length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content }];
}

export function getSingleStickerFromContent(content: string): Sticker | null {
  const match = content.trim().match(exactStickerTokenPattern);

  if (!match) {
    return null;
  }

  return getStickerById(match[1]);
}

export function describeStickerContentForModel(
  content: string,
  role: "user" | "assistant",
) {
  return parseStickerContent(content)
    .map((part) => {
      if (part.type === "text") {
        return part.content;
      }

      const actor = role === "user" ? "用户" : "助手";
      return `[${actor}发送了一个“${part.sticker.label}”的表情包]`;
    })
    .join("")
    .trim();
}

export function buildStickerInstruction() {
  const stickerList = stickerCatalog
    .map((sticker) => `- ${sticker.id}: ${sticker.label}`)
    .join("\n");

  return [
    "You may occasionally use one of these stickers when it naturally fits the conversation:",
    stickerList,
    "Sticker output format must be exactly [[sticker:ID]] on its own line.",
    "Use only an ID from the allowlist above.",
    "Use at most one sticker per reply.",
    "Do not use a sticker in every reply.",
    "Do not explain the sticker token syntax.",
    "Do not output local file paths, URLs, invented sticker IDs, HTML, or Markdown images for stickers.",
    "Text remains the main content unless the user explicitly asks for only a sticker.",
  ].join("\n");
}
