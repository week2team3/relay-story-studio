"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";
import styles from "@/components/auth/auth-form.module.css";
import type { SignupRequest } from "@/lib/types/api";

type RedirectTarget = "/home" | `/canvas/${string}`;

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextHref = normalizeRedirectTarget(searchParams.get("next"));
  const loginHref: Route =
    nextHref === "/home" ? "/login" : (`/login?next=${encodeURIComponent(nextHref)}` as Route);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload: SignupRequest = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      nickname: String(formData.get("nickname") ?? "")
    };

    setError(null);
    setIsSubmitting(true);

    startTransition(async () => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "회원가입에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }

      router.push(nextHref);
      router.refresh();
    });
  }

  return (
    <form className={`glass-panel ${styles.panel}`} onSubmit={handleSubmit}>
      <div className="stack">
        <h2 className={styles.title}>회원가입</h2>
        <p className={`body-copy ${styles.helper}`}>
          닉네임과 계정을 만들면 바로 작업을 시작할 수 있습니다.
        </p>
      </div>

      <div className="field">
        <label htmlFor="nickname">닉네임</label>
        <input id="nickname" maxLength={24} minLength={2} name="nickname" type="text" required />
      </div>

      <div className="field">
        <label htmlFor="email">이메일</label>
        <input autoComplete="email" id="email" name="email" type="email" required />
      </div>

      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input
          autoComplete="new-password"
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
        />
      </div>

      {error ? <p className="status-text status-error">{error}</p> : null}

      <div className={styles.footer}>
        <Link className="button-ghost" href={loginHref}>
          로그인
        </Link>
        <button className="button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "가입 중..." : "회원가입"}
        </button>
      </div>
    </form>
  );
}

function normalizeRedirectTarget(next: string | null): RedirectTarget {
  if (!next || !next.startsWith("/")) {
    return "/home";
  }

  if (next.startsWith("//")) {
    return "/home";
  }

  if (next.startsWith("/canvas/")) {
    return next as RedirectTarget;
  }

  return "/home";
}
