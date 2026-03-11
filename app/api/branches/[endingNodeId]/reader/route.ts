import { NextResponse } from "next/server";
import { buildReaderBranch } from "@/lib/story/buildReaderBranch";
import { handleRouteError } from "@/lib/server/api";
import { badRequest } from "@/lib/server/errors";
import type { ReaderBranchResponse } from "@/lib/types/api";

type RouteContext = {
  params: Promise<{
    endingNodeId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { endingNodeId } = await context.params;
    const { searchParams } = new URL(request.url);
    const shareKey = searchParams.get("shareKey")?.trim();

    if (!shareKey) {
      throw badRequest("shareKey is required.");
    }

    const branch = await buildReaderBranch(shareKey, endingNodeId);

    return NextResponse.json<ReaderBranchResponse>({ branch });
  } catch (error) {
    return handleRouteError(error);
  }
}

