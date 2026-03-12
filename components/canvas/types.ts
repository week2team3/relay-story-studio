import type {
  CanvasPresenceResponse,
  CreateNodeRequest,
  CreateNodeResponse,
  UpdateNodePositionResponse
} from "@/lib/types/api";
import type { CanvasDetail, Node, NodePosition } from "@/lib/types/domain";

export type CanvasWorkspaceData = CanvasDetail;
export type CanvasWorkspaceNode = Node;
export type CanvasPositionPayload = NodePosition;
export type CreateCanvasNodeInput = CreateNodeRequest;
export type CreateCanvasNodeResult = CreateNodeResponse;
export type PersistNodePositionResult = UpdateNodePositionResponse;
export type CanvasPresenceResult = CanvasPresenceResponse;
