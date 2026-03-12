import { NextResponse } from "next/server";
import { getSession, requireSession } from "@/lib/auth/server";
import { handleRouteError } from "@/lib/server/api";
import { heartbeatCanvasPresence, listActiveCanvasPresence } from "@/lib/services/presence";
import type { CanvasPresenceResponse } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    shareKey: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { shareKey } = await context.params;
    const session = await getSession();
    const result = await listActiveCanvasPresence(shareKey, session?.userId ?? null);

    return NextResponse.json<CanvasPresenceResponse>(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(_: Request, context: RouteContext) {
  try {
    const { shareKey } = await context.params;
    const session = await requireSession();
    await heartbeatCanvasPresence(shareKey, session.userId, session.nickname);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
