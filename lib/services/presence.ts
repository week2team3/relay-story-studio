import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { notFound } from "@/lib/server/errors";
import type { CanvasPresenceResponse } from "@/lib/types/api";
import { toObjectId } from "@/lib/utils/object-id";
import { CanvasModel, PresenceModel } from "@/models";

const ACTIVE_WINDOW_MS = 15_000;

export async function heartbeatCanvasPresence(shareKey: string, userId: string, nickname: string) {
  await connectToDatabase();

  const canvas = await CanvasModel.findOne({ shareKey });

  if (!canvas) {
    throw notFound("캔버스를 찾을 수 없습니다.");
  }

  const now = new Date();

  await PresenceModel.findOneAndUpdate(
    {
      canvasId: canvas._id,
      userId: toObjectId(userId, "userId")
    },
    {
      $set: {
        nickname: nickname.trim(),
        lastSeenAt: now
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

export async function listActiveCanvasPresence(
  shareKey: string,
  currentUserId: string | null
): Promise<CanvasPresenceResponse> {
  await connectToDatabase();

  const canvas = await CanvasModel.findOne({ shareKey });

  if (!canvas) {
    throw notFound("캔버스를 찾을 수 없습니다.");
  }

  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const currentObjectId = currentUserId ? new Types.ObjectId(currentUserId) : null;

  const collaborators = await PresenceModel.find({
    canvasId: canvas._id,
    lastSeenAt: { $gte: activeSince }
  })
    .sort({ lastSeenAt: -1 })
    .lean();

  return {
    collaborators: collaborators.map((presence) => ({
      userId: presence.userId.toString(),
      nickname: presence.nickname,
      lastSeenAt: presence.lastSeenAt.toISOString(),
      isCurrentUser: currentObjectId ? presence.userId.toString() === currentObjectId.toString() : false
    }))
  };
}
