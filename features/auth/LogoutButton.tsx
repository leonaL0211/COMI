"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "./api";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setError("");

    try {
      const loggedOut = await logout();

      if (!loggedOut) {
        setError("退出失败，请稍后再试。");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("退出失败，请稍后再试。");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="logout-area">
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
      <button
        className="ui-button ui-button-secondary w-full"
        type="button"
        disabled={isLoggingOut}
        onClick={handleLogout}
      >
        {isLoggingOut ? "正在退出..." : "退出私人空间"}
      </button>
    </div>
  );
}
