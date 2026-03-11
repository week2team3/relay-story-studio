import { notFound } from "next/navigation";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { getSession } from "@/lib/auth/server";
import { ApiError } from "@/lib/server/errors";
import { getCanvasDetailByShareKey } from "@/lib/services/canvas";

type CanvasPageProps = {
  params: Promise<{
    shareKey: string;
  }>;
};

export default async function CanvasPage({ params }: CanvasPageProps) {
  const { shareKey } = await params;
  const viewer = await getSession();

  try {
    const detail = await getCanvasDetailByShareKey(shareKey, viewer);

    return <CanvasWorkspace detail={detail} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
