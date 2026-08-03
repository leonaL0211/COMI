"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "./api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedAccessCode = accessCode.trim();

    if (!trimmedAccessCode || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await login(trimmedAccessCode);

      if (!result.ok) {
        setError(
          result.status === 503
            ? "私人访问暂未配置，请稍后再试。"
            : "访问码不正确，请重试。",
        );
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("暂时无法完成登录，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <div className="space-y-2 text-center">
        <p className="chat-header-kicker">Private Space</p>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Berry Chat
        </h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          请输入私人访问码
        </p>
      </div>

      <label className="login-field">
        <span>访问码</span>
        <input
          value={accessCode}
          type="password"
          autoComplete="current-password"
          maxLength={256}
          disabled={isSubmitting}
          onChange={(event) => setAccessCode(event.target.value)}
        />
      </label>

      {error ? <p className="login-error">{error}</p> : null}

      <button
        className="ui-button ui-button-primary min-h-11 w-full"
        type="submit"
        disabled={!accessCode.trim() || isSubmitting}
      >
        {isSubmitting ? "正在进入..." : "进入 Berry Chat"}
      </button>
    </form>
  );
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
