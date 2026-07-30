const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SupabaseServerConfig = {
  url: string;
  secretKey: string;
  ownerId: string;
};

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const ownerId = process.env.BERRY_OWNER_ID?.trim();

  if (!url) {
    throw new SupabaseConfigError("Missing SUPABASE_URL.");
  }

  if (!secretKey) {
    throw new SupabaseConfigError("Missing SUPABASE_SECRET_KEY.");
  }

  if (!ownerId || !uuidPattern.test(ownerId)) {
    throw new SupabaseConfigError("BERRY_OWNER_ID must be a valid UUID.");
  }

  return {
    url: url.replace(/\/+$/, ""),
    secretKey,
    ownerId,
  };
}

export function isValidUuid(value: string) {
  return uuidPattern.test(value);
}
