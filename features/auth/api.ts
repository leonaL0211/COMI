"use client";

export async function login(accessCode: string, testUser?: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(testUser ? { accessCode, testUser } : { accessCode }),
  });
  const body = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    error: typeof body?.error === "string" ? body.error : undefined,
  };
}

export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  return response.ok;
}
