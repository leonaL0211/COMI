"use client";

export async function login(accessCode: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessCode }),
  });

  return {
    ok: response.ok,
    status: response.status,
  };
}

export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  return response.ok;
}
