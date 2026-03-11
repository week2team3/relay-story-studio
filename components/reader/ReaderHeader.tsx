"use client";

import { useEffect, useState } from "react";
import styles from "./ReaderPage.module.css";

type ReaderHeaderProps = {
  title: string;
  sharePath: string;
  endingType: "manual" | "auto-max-depth";
};

export function ReaderHeader({ title, sharePath, endingType }: ReaderHeaderProps) {
  const [shareUrl, setShareUrl] = useState(sharePath);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setShareUrl(new URL(sharePath, window.location.origin).toString());
  }, [sharePath]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleCopyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <header className={styles.header}>
      <p className={styles.kicker}>리더</p>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.metaRow}>
        <span className={styles.metaPill}>{endingType === "manual" ? "사용자 엔딩" : "자동 엔딩"}</span>
        <button
          className={styles.metaLink}
          onClick={handleCopyShareUrl}
          title={shareUrl}
          type="button"
        >
          {copied ? "복사됨" : "리더 링크 복사"}
        </button>
      </div>
    </header>
  );
}
