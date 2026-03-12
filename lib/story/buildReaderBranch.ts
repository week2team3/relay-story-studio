import type { AssetDocument } from "@/models";
import { AssetModel } from "@/models";
import type { ReaderBranchContent, ReaderSegment } from "@/lib/types/domain";
import { assembleBranch } from "./assembleBranch";

type ReaderAsset = {
  id: string;
  url: string;
  prompt: string | null;
};

function normalizeText(content: string) {
  return content
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("\n\n");
}

function buildTextSegment(nodeId: string, content: string): ReaderSegment | null {
  const text = normalizeText(content);

  if (!text) {
    return null;
  }

  return {
    nodeId,
    kind: "text",
    text
  };
}

function buildImageSegments(nodeId: string, assets: ReaderAsset[]): ReaderSegment[] {
  return assets.map((asset, index) => ({
    nodeId,
    kind: "image" as const,
    imageUrl: asset.url,
    imageAlt: asset.prompt?.trim() || `Story image ${index + 1}`
  }));
}

function serializeAsset(asset: AssetDocument): ReaderAsset {
  return {
    id: asset._id.toString(),
    url: asset.url,
    prompt: asset.prompt
  };
}

export async function buildReaderBranch(shareKey: string, endingNodeId: string): Promise<ReaderBranchContent> {
  const { canvas, endingNode, nodes } = await assembleBranch({ shareKey, endingNodeId });
  const assetIds = nodes.flatMap((node) => node.imageAssetIds);
  const assets = assetIds.length
    ? await AssetModel.find({
        _id: { $in: assetIds },
        canvasId: canvas.id
      })
    : [];
  const assetMap = new Map(assets.map((asset) => [asset._id.toString(), serializeAsset(asset)]));
  const segments: ReaderSegment[] = [];

  for (const node of nodes) {
    const textSegment = buildTextSegment(node.id, node.content);

    if (textSegment) {
      segments.push(textSegment);
    }

    const nodeAssets = node.imageAssetIds
      .map((assetId) => assetMap.get(assetId))
      .filter((asset): asset is ReaderAsset => Boolean(asset));

    segments.push(...buildImageSegments(node.id, nodeAssets));
  }

  const participantNicknames = Array.from(
    new Set(
      nodes
        .filter((node) => node.nodeKind === "user")
        .flatMap((node) => (node.authorNickname?.trim() ? [node.authorNickname.trim()] : []))
    )
  );

  return {
    canvas,
    endingNodeId: endingNode.id,
    endingType: endingNode.endingType ?? "manual",
    sharePath: `/read/${canvas.shareKey}/${endingNode.id}`,
    segments,
    participantNicknames
  };
}
