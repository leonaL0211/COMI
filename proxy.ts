import { NextRequest, NextResponse } from "next/server";
import {
  getAuthConfig,
  sessionCookieName,
} from "@/server/auth/auth-config";
import { verifySessionToken } from "@/server/auth/session";

const publicFilePattern =
  /\.(?:ico|png|jpg|jpeg|webp|svg|gif|txt|xml|webmanifest|js)$/i;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
