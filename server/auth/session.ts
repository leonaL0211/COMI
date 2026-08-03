const sessionVersion = 1;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type SessionPayload = {
  v: typeof sessionVersion;
  exp: number;
};

export async function createSessionToken(input: {
  secret: string;
  maxAgeSeconds: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const payload: SessionPayload = {
    v: sessionVersion,
    exp: Math.floor(now.getTime() / 1000) + input.maxAgeSeconds,
  };
  const encodedPayload = base64UrlEncode(
    textEncoder.encode(JSON.stringify(payload)),
  );
  const signature = await sign(encodedPayload, input.secret);

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = new Date(),
) {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature, extra] = token.split(".");

  if (!encodedPayload || !signature || extra) {
    return false;
  }

  const expectedSignature = await sign(encodedPayload, secret);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  const payload = parsePayload(encodedPayload);

  if (!payload || payload.v !== sessionVersion) {
    return false;
  }

  return payload.exp > Math.floor(now.getTime() / 1000);
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(payload),
  );

  return base64UrlEncode(new Uint8Array(signature));
}

function parsePayload(encodedPayload: string): SessionPayload | null {
  try {
    const payload = JSON.parse(
      textDecoder.decode(base64UrlDecode(encodedPayload)),
    ) as Partial<SessionPayload>;

    if (
      payload.v !== sessionVersion ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp)
    ) {
      return null;
    }

    return {
      v: sessionVersion,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function constantTimeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return diff === 0;
}
