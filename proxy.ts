import { NextRequest, NextResponse } from "next/server";
import {
  getAuthConfig,
  sessionCookieName,
  sessionMaxAgeSeconds,
} from "@/server/auth/auth-config";
import { createSessionToken, verifySessionToken } from "@/server/auth/session";

const publicFilePattern =
  /\.(?:ico|png|jpg|jpeg|webp|svg|gif|txt|xml|webmanifest|js)$/i;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only this explicit demo entry may issue a session without an access code.
  // Reuse the existing participant claim and cookie so owner isolation survives reloads.
  if (
    request.method === "GET" &&
    pathname === "/login" &&
    request.nextUrl.searchParams.get("testUser") === "P04"
  ) {
    const authConfig = getAuthConfig();

    if (authConfig.status !== "enabled") {
      return noStoreJson({ error: "Private access is not configured." }, 503);
    }

    const token = await createSessionToken({
      secret: authConfig.sessionSecret,
      maxAgeSeconds: sessionMaxAgeSeconds,
      participant: "P04",
    });
    const response = NextResponse.redirect(new URL("/", request.url));
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAgeSeconds,
    });
    return response;
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const authConfig = getAuthConfig();

  if (authConfig.status === "disabled") {
    return NextResponse.next();
  }

  if (authConfig.status === "invalid") {
    return isApiPath(pathname)
      ? noStoreJson({ error: "Private access is not configured." }, 503)
      : redirectToLogin(request);
  }

  const isAuthenticated = await verifySessionToken(
    request.cookies.get(sessionCookieName)?.value,
    authConfig.sessionSecret,
  ).catch(() => false);

  if (isAuthenticated) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (isApiPath(pathname)) {
    return noStoreJson({ error: "Unauthorized." }, 401);
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: ["/:path*"],
};

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image/") ||
    (!pathname.startsWith("/api/") && publicFilePattern.test(pathname))
  );
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (isSafeNextPath(nextPath)) {
    loginUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(loginUrl);
}

function isSafeNextPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

function noStoreJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
