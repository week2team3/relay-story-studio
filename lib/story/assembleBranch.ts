import { connectToDatabase } from "@/lib/db/mongoose";
import { badRequest, notFound } from "@/lib/server/errors";
import type { Node } from "@/lib/types/domain";
import { loadAuthorNicknameMap } from "@/lib/users/authors";
import { serializeNode } from "@/lib/utils/serializers";
import { CanvasModel, NodeModel } from "@/models";

type AssembleBranchInput = {
  shareKey: string;
  endingNodeId: string;
};

export async function assembleBranch({ shareKey, endingNodeId }: AssembleBranchInput) {
  await connectToDatabase();

  const canvas = await CanvasModel.findOne({ shareKey });

  if (!canvas) {
    throw notFound("Canvas not found for that share key.");
  }

  const endingNode = await NodeModel.findById(endingNodeId);

  if (!endingNode || endingNode.canvasId.toString() !== canvas._id.toString()) {
    throw notFound("Ending node not found for that reader path.");
  }

  if (!endingNode.isEnding) {
    throw badRequest("Reader routes can only load ending nodes.");
  }

  const orderedIds = [...endingNode.ancestorIds.map((ancestorId) => ancestorId.toString()), endingNode._id.toString()];
  const branchNodes = await NodeModel.find({
    _id: { $in: orderedIds }
  });
  const authorNicknameMap = await loadAuthorNicknameMap(branchNodes.map((node) => node.createdBy));
  const nodeMap = new Map(
    branchNodes.map((node) => [
      node._id.toString(),
      serializeNode(node, {
        authorNickname: authorNicknameMap.get(node.createdBy.toString()) ?? null
      })
    ])
  );
  const serializedEndingNode = serializeNode(endingNode, {
    authorNickname: authorNicknameMap.get(endingNode.createdBy.toString()) ?? null
  });
  const orderedNodes = orderedIds.map((nodeId) => {
    const node = nodeMap.get(nodeId);

    if (!node) {
      throw notFound("A branch node could not be resolved for this reader path.");
    }

    return node;
  });

  return {
    canvas: {
      id: canvas._id.toString(),
      title: canvas.title,
      shareKey: canvas.shareKey
    },
    endingNode: serializedEndingNode,
    nodes: orderedNodes satisfies Node[]
  };
}
