"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { CreateCanvasRequest, CreateCanvasResponse } from "@/lib/types/api";

export function CreateCanvasForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: CreateCanvasRequest = {
      title: String(formData.get("title") ?? ""),
      rootContent: String(formData.get("rootContent") ?? ""),
      maxUserNodesPerBranch: Number(formData.get("maxUserNodesPerBranch") ?? 12),
      rootPosition: {
        x: 0,
        y: 0
      }
    };

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    startTransition(async () => {
      const response = await fetch("/api/canvases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as CreateCanvasResponse & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "캔버스를 만들지 못했습니다.");
        setIsSubmitting(false);
        return;
      }

      const autoEndingNote = data.autoEndingNode ? " 자동 엔딩 노드도 함께 생성되었습니다." : "";
      setSuccess(`캔버스가 생성되었습니다.${autoEndingNote}`);
      form.reset();
      setIsSubmitting(false);
      router.push(`/canvas/${data.canvas.shareKey}`);
      router.refresh();
    });
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="title">제목</label>
        <input id="title" maxLength={80} minLength={3} name="title" type="text" required />
      </div>

      <div className="field">
        <label htmlFor="rootContent">시작 본문</label>
        <textarea id="rootContent" name="rootContent" required />
      </div>

      <div className="field">
        <label htmlFor="maxUserNodesPerBranch">분기당 최대 작성 노드 수</label>
        <input
          defaultValue={12}
          id="maxUserNodesPerBranch"
          max={50}
          min={1}
          name="maxUserNodesPerBranch"
          type="number"
          required
        />
      </div>

      {error ? <p className="status-text status-error">{error}</p> : null}
      {success ? <p className="status-text status-success">{success}</p> : null}

      <button className="button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "생성 중..." : "캔버스 만들기"}
      </button>
    </form>
  );
}
