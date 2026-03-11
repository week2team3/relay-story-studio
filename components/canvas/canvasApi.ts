import { CreateCanvasNodeInput, CreateCanvasNodeResult, CanvasPositionPayload, PersistNodePositionResult } from "./types";

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "예상하지 못한 서버 오류가 발생했습니다.";
  } catch {
    return "예상하지 못한 서버 오류가 발생했습니다.";
  }
}

export async function persistNodePosition(nodeId: string, position: CanvasPositionPayload) {
  const response = await fetch(`/api/nodes/${nodeId}/position`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ position }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as PersistNodePositionResult;
}

export async function createCanvasNode(input: CreateCanvasNodeInput) {
  const response = await fetch("/api/nodes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as CreateCanvasNodeResult;
}
