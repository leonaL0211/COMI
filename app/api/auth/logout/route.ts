import { NextResponse } from "next/server";
import { sessionCookieName } from "@/server/auth/auth-config";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json(
    { authenticated: false },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
