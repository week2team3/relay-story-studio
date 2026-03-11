"use client";

import Image from "next/image";
import { ChangeEvent, useId, useState } from "react";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  MediaAsset,
  UploadAssetResponse
} from "@/lib/media/types";
import styles from "./MediaPicker.module.css";

type MediaPickerProps = {
  canvasId: string;
  baseNodeId: string;
  selectedAssets: MediaAsset[];
  onChange: (assets: MediaAsset[]) => void;
  disabled?: boolean;
  maxAssets?: number;
};

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "이미지 요청을 처리하지 못했습니다.";
  } catch {
    return "이미지 요청을 처리하지 못했습니다.";
  }
}

export function MediaPicker({
  canvasId,
  baseNodeId,
  selectedAssets,
  onChange,
  disabled = false,
  maxAssets = 4
}: MediaPickerProps) {
  const [imagePrompt, setImagePrompt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputId = useId();
  const atLimit = selectedAssets.length >= maxAssets;

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (atLimit) {
      setMessage(`이미지는 최대 ${maxAssets}개까지 첨부할 수 있습니다.`);
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("canvasId", canvasId);
      formData.set("baseNodeId", baseNodeId);
      formData.set("file", file);

      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as UploadAssetResponse;
      onChange([...selectedAssets, payload.asset].slice(0, maxAssets));
      setMessage("이미지를 업로드했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerate() {
    if (!imagePrompt.trim()) {
      setMessage("이미지 설명을 입력해 주세요.");
      return;
    }

    if (atLimit) {
      setMessage(`이미지는 최대 ${maxAssets}개까지 첨부할 수 있습니다.`);
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const payload: GenerateImageRequest = {
        canvasId,
        baseNodeId,
        prompt: imagePrompt.trim()
      };

      const response = await fetch("/api/ai/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const result = (await response.json()) as GenerateImageResponse;
      onChange([...selectedAssets, result.asset].slice(0, maxAssets));
      setImagePrompt("");
      setMessage(
        result.source === "openai"
          ? "AI 이미지를 생성했습니다."
          : "미리보기 이미지를 생성했습니다."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지를 생성하지 못했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleRemove(assetId: string) {
    onChange(selectedAssets.filter((asset) => asset.id !== assetId));
  }

  return (
    <section className={styles.root}>
      <div className={styles.controls}>
        <label className={styles.uploadButton} htmlFor={inputId}>
          {isUploading ? "업로드 중..." : "이미지 업로드"}
        </label>
        <input
          accept="image/png,image/jpeg,image/webp,image/gif"
          className={styles.hiddenInput}
          disabled={disabled || isUploading || isGenerating || atLimit}
          id={inputId}
          onChange={handleUploadChange}
          type="file"
        />
        <button
          className={styles.generateButton}
          disabled={disabled || isUploading || isGenerating || atLimit}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating ? "생성 중..." : "AI 이미지"}
        </button>
      </div>

      <textarea
        className={styles.promptInput}
        disabled={disabled || isUploading || isGenerating || atLimit}
        onChange={(event) => setImagePrompt(event.target.value)}
        placeholder="생성하고 싶은 분위기나 장면을 입력하세요."
        value={imagePrompt}
      />

      <p className={styles.helperText}>
        업로드 이미지와 AI 이미지를 합쳐 최대 {maxAssets}개까지 첨부할 수 있습니다.
      </p>

      {message ? <p className={styles.message}>{message}</p> : null}

      {selectedAssets.length > 0 ? (
        <div className={styles.assetGrid}>
          {selectedAssets.map((asset) => (
            <figure className={styles.assetCard} key={asset.id}>
              <Image
                alt={asset.prompt ?? "첨부 이미지"}
                className={styles.assetImage}
                height={320}
                src={asset.url}
                unoptimized
                width={320}
              />
              <figcaption className={styles.assetMeta}>
                <span>{asset.type === "generated-image" ? "AI 이미지" : "업로드 이미지"}</span>
                <button className={styles.removeButton} onClick={() => handleRemove(asset.id)} type="button">
                  삭제
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}
