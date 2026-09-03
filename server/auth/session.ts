const sessionVersion = 1;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type SessionPayload = {
  v: typeof sessionVersion;
  exp: number;
  /**
   * Optional test-participant tag (e.g. "P01"). Only ever set by the login
   * route after whitelist validation (see server/auth/participants.ts);
   * never trust this field without re-checking it against the whitelist at
   * the point of use.
   */
  participant?: string;
};

export async function createSessionToken(input: {
  secret: string;
  maxAgeSeconds: number;
  now?: Date;
  participant?: string;
}) {
  const now = input.now ?? new Date();
  const payload: SessionPayload = {
    v: sessionVersion,
    exp: Math.floor(now.getTime() / 1000) + input.maxAgeSeconds,
    ...(input.participant ? { participant: input.participant } : {}),
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
  const payload = await verifySessionPayload(token, secret, now);

  return payload !== null;
}

/**
 * Same verification as verifySessionToken, but returns the verified
 * payload (including the optional participant tag) instead of a boolean.
 * Used by server/auth/owner-context.ts to resolve which owner_id a
 * request belongs to. Returns null for any missing/malformed/expired/
 * mis-signed token — identical rejection behavior to verifySessionToken.
 */
export async function verifySessionPayload(
  token: string | undefined,
  secret: string,
  now = new Date(),
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature, extra] = token.split(".");

  if (!encodedPayload || !signature || extra) {
    return null;
  }

  const expectedSignature = await sign(encodedPayload, secret);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = parsePayload(encodedPayload);

  if (!payload || payload.v !== sessionVersion) {
    return null;
  }

  if (payload.exp <= Math.floor(now.getTime() / 1000)) {
    return null;
  }

  return payload;
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
      ...(typeof payload.participant === "string"
        ? { participant: payload.participant }
        : {}),
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
