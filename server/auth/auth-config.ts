export const sessionCookieName = "berry_chat_session";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
export const maxAccessCodeLength = 256;

export type AuthConfig =
  | {
      status: "enabled";
      accessCode: string;
      sessionSecret: string;
    }
  | {
      status: "disabled";
    }
  | {
      status: "invalid";
    };

export function getAuthConfig(): AuthConfig {
  const accessCode = process.env.BERRY_ACCESS_CODE?.trim() ?? "";
  const sessionSecret = process.env.BERRY_SESSION_SECRET?.trim() ?? "";

  if (
    process.env.NODE_ENV !== "production" &&
    !accessCode &&
    !sessionSecret
  ) {
    return { status: "disabled" };
  }

  if (
    !accessCode ||
    !sessionSecret ||
    accessCode === sessionSecret ||
    accessCode.length > maxAccessCodeLength
  ) {
    return { status: "invalid" };
  }

  return {
    status: "enabled",
    accessCode,
    sessionSecret,
  };
}
