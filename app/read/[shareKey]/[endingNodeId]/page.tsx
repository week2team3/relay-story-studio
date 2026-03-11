import { notFound } from "next/navigation";
import { ReaderPage } from "@/components/reader/ReaderPage";
import { buildReaderBranch } from "@/lib/story/buildReaderBranch";
import { ApiError } from "@/lib/server/errors";

type ReaderRoutePageProps = {
  params: Promise<{
    shareKey: string;
    endingNodeId: string;
  }>;
};

export default async function ReaderRoutePage({ params }: ReaderRoutePageProps) {
  const { shareKey, endingNodeId } = await params;

  try {
    const branch = await buildReaderBranch(shareKey, endingNodeId);

    return <ReaderPage branch={branch} />;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
      notFound();
    }

    throw error;
  }
}
